import { LRUCache } from "lru-cache";
import Bottleneck from "bottleneck";
import api from "./api.js";

// Starting guess only. Once upstream responds, its RateLimit headers drive the
// limiter (see applyRateLimitHeaders), so a per-key limit raised on the API
// side is picked up automatically.
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;
const DEFAULT_BURST_CAPACITY = DEFAULT_RATE_LIMIT_PER_MINUTE;
const DEFAULT_MAX_CONCURRENT_UPSTREAM = 8;
const configuredRateLimit = Number.parseInt(
  process.env.API_RATE_LIMIT_PER_MINUTE || "",
  10,
);
const configuredBurstCapacity = Number.parseInt(
  process.env.API_RATE_LIMIT_BURST || "",
  10,
);
const configuredMaxConcurrent = Number.parseInt(
  process.env.API_MAX_CONCURRENT_UPSTREAM || "",
  10,
);
const RATE_LIMIT_PER_MINUTE =
  Number.isFinite(configuredRateLimit) && configuredRateLimit > 0
    ? configuredRateLimit
    : DEFAULT_RATE_LIMIT_PER_MINUTE;
const BOTTLENECK_RESERVOIR =
  Number.isFinite(configuredBurstCapacity) && configuredBurstCapacity > 0
    ? configuredBurstCapacity
    : DEFAULT_BURST_CAPACITY;
const BOTTLENECK_INCREASE_INTERVAL_MS = 1000;
const BOTTLENECK_INCREASE_AMOUNT = Math.max(
  1,
  Math.floor(RATE_LIMIT_PER_MINUTE / 60),
);
const BOTTLENECK_INCREASE_MAX = Math.max(
  BOTTLENECK_RESERVOIR,
  RATE_LIMIT_PER_MINUTE,
);
const BOTTLENECK_MAX_CONCURRENT =
  Number.isFinite(configuredMaxConcurrent) && configuredMaxConcurrent > 0
    ? configuredMaxConcurrent
    : DEFAULT_MAX_CONCURRENT_UPSTREAM;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RETRIES_429 = 3;
const RETRY_BASE_DELAY_MS = 1000;
const JSON_CACHE_MAX_ENTRIES = 10_000;
const ICON_CACHE_MAX_ENTRIES = 5_000;

const jsonCache = new LRUCache({
  max: JSON_CACHE_MAX_ENTRIES,
  ttl: MAX_TTL_MS,
  ttlAutopurge: false,
  updateAgeOnGet: false,
});

const iconCache = new LRUCache({
  max: ICON_CACHE_MAX_ENTRIES,
  ttl: MAX_TTL_MS,
  ttlAutopurge: false,
  updateAgeOnGet: false,
});

const limiter = new Bottleneck({
  reservoir: BOTTLENECK_RESERVOIR,
  reservoirIncreaseAmount: BOTTLENECK_INCREASE_AMOUNT,
  reservoirIncreaseInterval: BOTTLENECK_INCREASE_INTERVAL_MS,
  reservoirIncreaseMaximum: BOTTLENECK_INCREASE_MAX,
  maxConcurrent: BOTTLENECK_MAX_CONCURRENT,
  minTime: 0,
});

const inFlight = new Map();

// Slack added to the upstream reset time before refilling, to cover clock
// drift and the server rounding reset seconds up.
const RESET_SLACK_MS = 500;
// Two reports whose reset times are this close belong to the same window.
const SAME_WINDOW_TOLERANCE_MS = 2000;

function emptyUpstreamLimit() {
  return {
    headerDriven: false,
    limit: null,
    windowMs: null,
    remaining: null,
    resetAt: null,
    updatedAt: null,
  };
}

const upstreamLimit = emptyUpstreamLimit();
let resetTimer = null;

const stats = {
  hits: 0,
  misses: 0,
  revalidations: 0,
  retries: 0,
  upstreamCalls: 0,
};

function isBinary(config) {
  const rt = config?.responseType;
  return rt === "arraybuffer" || rt === "stream" || rt === "blob";
}

function pickCache(config) {
  return isBinary(config) ? iconCache : jsonCache;
}

function stableStringify(value) {
  if (value === undefined) return "";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(value[k]))
      .join(",") +
    "}"
  );
}

function cacheKey(method, url, config, body) {
  const params = config?.params ? stableStringify(config.params) : "";
  const responseType = config?.responseType || "json";
  const bodyKey = body !== undefined ? stableStringify(body) : "";
  return `${method.toUpperCase()} ${url}?${params}#${responseType}#${bodyKey}`;
}

function buildCacheLookup(method, url, config = {}, body) {
  return {
    cache: pickCache(config),
    key: cacheKey(method, url, config, body),
  };
}

function parseMaxAgeMs(cacheControl) {
  if (!cacheControl) return null;
  const match = String(cacheControl).match(/(?:^|,\s*)max-age=(\d+)/i);
  if (!match) return null;
  const seconds = parseInt(match[1], 10);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

function computeTtl(headers) {
  const cc = headers?.["cache-control"];
  if (!cc) return DEFAULT_TTL_MS;
  if (/no-store|no-cache/i.test(cc)) return 0;
  const maxAge = parseMaxAgeMs(cc);
  if (maxAge === null) return DEFAULT_TTL_MS;
  return Math.min(maxAge, MAX_TTL_MS);
}

function parseRetryAfterMs(headers) {
  const retryAfter = headers?.["retry-after"];
  if (!retryAfter) return null;
  const secs = parseInt(retryAfter, 10);
  if (!Number.isNaN(secs) && /^\d+$/.test(String(retryAfter).trim())) {
    return secs * 1000;
  }
  const dateMs = Date.parse(retryAfter);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function readHeader(headers, name) {
  if (!headers) return undefined;
  const value =
    typeof headers.get === "function" ? headers.get(name) : headers[name];
  return value == null ? undefined : String(value);
}

function toInt(value) {
  if (value == null) return null;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function readParam(text, names) {
  if (!text) return null;
  const re = new RegExp(`(?:^|[;,\\s])(?:${names.join("|")})=(\\d+)`, "i");
  const match = text.match(re);
  return match ? Number.parseInt(match[1], 10) : null;
}

// Splits draft-8 list items (`"a"; r=1; t=2, "b"; r=3; t=4`).
function splitPolicyList(value) {
  return /^\s*"/.test(value) ? value.split(/,(?=\s*")/) : [value];
}

/**
 * Parses IETF RateLimit headers. Supports draft-8 (what the tools server
 * sends: `RateLimit: "name"; r=119; t=60` + `RateLimit-Policy: "name"; q=120; w=60`),
 * draft-7 (`RateLimit: limit=120, remaining=119, reset=60`) and
 * draft-6 (`RateLimit-Limit` / `-Remaining` / `-Reset`).
 * With several draft-8 policies, the one with the least remaining wins.
 */
function parseRateLimitHeaders(headers) {
  const combined = readHeader(headers, "ratelimit");
  const policyHeader = readHeader(headers, "ratelimit-policy");

  let remaining = null;
  let resetSec = null;
  let limit = null;
  let windowSec = null;

  if (combined) {
    for (const item of splitPolicyList(combined)) {
      const r = readParam(item, ["r", "remaining"]);
      if (r === null) continue;
      if (remaining === null || r < remaining) {
        remaining = r;
        resetSec = readParam(item, ["t", "reset"]);
        limit = readParam(item, ["limit"]);
      }
    }
  } else {
    remaining = toInt(readHeader(headers, "ratelimit-remaining"));
    resetSec = toInt(readHeader(headers, "ratelimit-reset"));
    limit = toInt(readHeader(headers, "ratelimit-limit"));
  }

  if (remaining === null || resetSec === null) return null;

  if (policyHeader) {
    // draft-8: `"name"; q=120; w=60`; draft-6/7: `120;w=60`.
    const quotas = splitPolicyList(policyHeader)
      .map((p) => ({
        q: readParam(p, ["q"]) ?? toInt(p.split(";")[0]),
        w: readParam(p, ["w"]),
      }))
      .filter((p) => p.q !== null);
    if (quotas.length) {
      const tightest = quotas.reduce((a, b) => (b.q < a.q ? b : a));
      limit = limit ?? tightest.q;
      windowSec = tightest.w;
    }
  }

  return {
    remaining,
    resetMs: resetSec * 1000,
    limit,
    windowMs: windowSec !== null ? windowSec * 1000 : null,
  };
}

function scheduleWindowReset(delayMs) {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resetTimer = null;
    const refill = upstreamLimit.limit ?? RATE_LIMIT_PER_MINUTE;
    upstreamLimit.remaining = refill;
    upstreamLimit.resetAt = null;
    limiter.updateSettings({ reservoir: refill }).catch(() => {});
  }, delayMs);
  resetTimer.unref?.();
}

/**
 * Syncs the limiter with what upstream says is left in the current window.
 * Called for every upstream response (including 429s) so the limiter follows
 * the real per-key limit instead of the static configured one.
 */
function applyRateLimitHeaders(headers) {
  const info = parseRateLimitHeaders(headers);
  if (!info) return;

  const now = Date.now();
  const resetAt = now + info.resetMs;
  const limitChanged =
    info.limit !== null &&
    upstreamLimit.limit !== null &&
    info.limit !== upstreamLimit.limit;
  const sameWindow =
    !limitChanged &&
    upstreamLimit.resetAt !== null &&
    Math.abs(resetAt - upstreamLimit.resetAt) < SAME_WINDOW_TOLERANCE_MS;

  // Responses can arrive out of order; within one window the lowest reported
  // remaining is the freshest.
  const remaining = sameWindow
    ? Math.min(info.remaining, upstreamLimit.remaining)
    : info.remaining;

  const settings = {};
  if (!upstreamLimit.headerDriven) {
    // Upstream tells us when the window resets; stop guessing a refill rate.
    settings.reservoirIncreaseAmount = null;
    settings.reservoirIncreaseInterval = null;
  }

  upstreamLimit.headerDriven = true;
  if (info.limit !== null) upstreamLimit.limit = info.limit;
  if (info.windowMs !== null) upstreamLimit.windowMs = info.windowMs;
  upstreamLimit.remaining = remaining;
  if (!sameWindow) upstreamLimit.resetAt = resetAt;
  upstreamLimit.updatedAt = now;

  // Jobs already started may not be counted upstream yet. The job reporting
  // these headers is itself still executing, hence the -1.
  const othersExecuting = Math.max(0, (limiter.counts().EXECUTING ?? 0) - 1);
  settings.reservoir = Math.max(0, remaining - othersExecuting);

  limiter.updateSettings(settings).catch(() => {});
  scheduleWindowReset(upstreamLimit.resetAt - now + RESET_SLACK_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function peek(method, url, config = {}, body) {
  if (config?.cache === false) return null;

  const { cache, key } = buildCacheLookup(method, url, config, body);
  const entry = cache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return {
    data: entry.data,
    headers: entry.headers,
    status: entry.status,
    fromCache: true,
  };
}

function prime(method, url, response, config = {}, body) {
  if (config?.cache === false || !response) return;

  const cc = response.headers?.["cache-control"];
  if (cc && /no-store|no-cache/i.test(cc)) {
    return;
  }

  const { cache, key } = buildCacheLookup(method, url, config, body);
  const ttl = computeTtl(response.headers);

  cache.set(key, {
    data: response.data,
    headers: response.headers,
    status: response.status,
    etag: response.headers?.etag || null,
    expiresAt: Date.now() + ttl,
  });
}

async function performRequest(method, url, config, body) {
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    try {
      stats.upstreamCalls++;
      let response;
      if (method === "get") {
        response = await api.get(url, config);
      } else if (method === "post") {
        response = await api.post(url, body, config);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }
      applyRateLimitHeaders(response?.headers);
      return response;
    } catch (error) {
      applyRateLimitHeaders(error?.response?.headers);
      const status = error?.response?.status;
      if (status === 429 && attempt < MAX_RETRIES_429) {
        const wait =
          parseRetryAfterMs(error.response?.headers) ??
          RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        stats.retries++;
        console.warn(
          `[cachedApi] 429 from ${url}; waiting ${wait}ms (retry ${attempt + 1}/${MAX_RETRIES_429})`,
        );
        await sleep(wait);
        continue;
      }
      throw error;
    }
  }
}

async function fetchWithCache(method, url, config = {}, body) {
  const cacheEnabled = config?.cache !== false;
  const cache = pickCache(config);
  const { key } = buildCacheLookup(method, url, config, body);

  if (cacheEnabled) {
    const entry = peek(method, url, config, body);
    if (entry) {
      stats.hits++;
      return entry;
    }
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      stats.misses++;

      const cachedEntry = cacheEnabled ? cache.get(key) : null;
      const isRevalidation = Boolean(cachedEntry?.etag);

      const requestConfig = { ...config };
      delete requestConfig.cache;
      if (isRevalidation) {
        requestConfig.headers = {
          ...(requestConfig.headers || {}),
          "If-None-Match": cachedEntry.etag,
        };
        const userValidateStatus = requestConfig.validateStatus;
        requestConfig.validateStatus = (s) =>
          s === 304 ||
          (userValidateStatus ? userValidateStatus(s) : s >= 200 && s < 300);
      }

      const response = await limiter.schedule(() =>
        performRequest(method, url, requestConfig, body),
      );

      if (isRevalidation && response.status === 304) {
        stats.revalidations++;
        const refreshedTtl = computeTtl(response.headers);
        cache.set(key, {
          ...cachedEntry,
          expiresAt: Date.now() + refreshedTtl,
        });
        return {
          data: cachedEntry.data,
          headers: cachedEntry.headers,
          status: 200,
          fromCache: true,
        };
      }

      if (cacheEnabled) {
        prime(method, url, response, config, body);
      }

      return {
        data: response.data,
        headers: response.headers,
        status: response.status,
        fromCache: false,
      };
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

function get(url, config) {
  return fetchWithCache("get", url, config);
}

function post(url, body, config) {
  return fetchWithCache("post", url, config, body);
}

async function getCacheStats() {
  return {
    ...stats,
    jsonCacheSize: jsonCache.size,
    iconCacheSize: iconCache.size,
    inFlight: inFlight.size,
    limiterCounts: limiter.counts(),
    reservoir: await limiter.currentReservoir(),
    rateLimitPerMinute: upstreamLimit.limit ?? RATE_LIMIT_PER_MINUTE,
    configuredRateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
    upstreamLimit: { ...upstreamLimit },
    burstCapacity: BOTTLENECK_RESERVOIR,
    maxConcurrentUpstream: BOTTLENECK_MAX_CONCURRENT,
  };
}

function clearCache() {
  jsonCache.clear();
  iconCache.clear();
  inFlight.clear();
}

// Forget upstream-reported limits and go back to configured pacing (tests).
async function resetRateLimitState() {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = null;
  Object.assign(upstreamLimit, emptyUpstreamLimit());
  await limiter.updateSettings({
    reservoir: BOTTLENECK_RESERVOIR,
    reservoirIncreaseAmount: BOTTLENECK_INCREASE_AMOUNT,
    reservoirIncreaseInterval: BOTTLENECK_INCREASE_INTERVAL_MS,
  });
}

function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.revalidations = 0;
  stats.retries = 0;
  stats.upstreamCalls = 0;
}

export default {
  get,
  post,
  peek,
  prime,
  getCacheStats,
  clearCache,
  resetStats,
  resetRateLimitState,
};
export {
  stableStringify,
  parseMaxAgeMs,
  parseRetryAfterMs,
  parseRateLimitHeaders,
  computeTtl,
  cacheKey,
  peek,
  prime,
};
