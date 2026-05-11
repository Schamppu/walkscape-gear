import { LRUCache } from "lru-cache";
import Bottleneck from "bottleneck";
import api from "./api.js";

const RATE_LIMIT_PER_MINUTE = 120;
const BOTTLENECK_RESERVOIR = RATE_LIMIT_PER_MINUTE;
const BOTTLENECK_REFRESH_MS = 60_000;
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
  reservoirRefreshAmount: BOTTLENECK_RESERVOIR,
  reservoirRefreshInterval: BOTTLENECK_REFRESH_MS,
  minTime: 0,
});

const inFlight = new Map();

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
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
    "}"
  );
}

function cacheKey(method, url, config, body) {
  const params = config?.params ? stableStringify(config.params) : "";
  const responseType = config?.responseType || "json";
  const bodyKey = body !== undefined ? stableStringify(body) : "";
  return `${method.toUpperCase()} ${url}?${params}#${responseType}#${bodyKey}`;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performRequest(method, url, config, body) {
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    try {
      stats.upstreamCalls++;
      if (method === "get") {
        return await api.get(url, config);
      }
      if (method === "post") {
        return await api.post(url, body, config);
      }
      throw new Error(`Unsupported method: ${method}`);
    } catch (error) {
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
  const key = cacheKey(method, url, config, body);

  if (cacheEnabled) {
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      stats.hits++;
      return {
        data: entry.data,
        headers: entry.headers,
        status: entry.status,
        fromCache: true,
      };
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
          s === 304 || (userValidateStatus ? userValidateStatus(s) : s >= 200 && s < 300);
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
        const cc = response.headers?.["cache-control"];
        const noStore = cc && /no-store|no-cache/i.test(cc);
        if (!noStore) {
          const ttl = computeTtl(response.headers);
          cache.set(key, {
            data: response.data,
            headers: response.headers,
            status: response.status,
            etag: response.headers?.etag || null,
            expiresAt: Date.now() + ttl,
          });
        }
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
  };
}

function clearCache() {
  jsonCache.clear();
  iconCache.clear();
  inFlight.clear();
}

function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.revalidations = 0;
  stats.retries = 0;
  stats.upstreamCalls = 0;
}

export default { get, post, getCacheStats, clearCache, resetStats };
export { stableStringify, parseMaxAgeMs, parseRetryAfterMs, computeTtl, cacheKey };
