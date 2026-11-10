import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./api.js", () => ({
  default: mockApi,
}));

const {
  default: cachedApi,
  stableStringify,
  parseMaxAgeMs,
  parseRetryAfterMs,
  parseRateLimitHeaders,
  computeTtl,
} = await import("./cachedApi.js");

function jsonResponse(data, headers = {}) {
  return {
    data,
    status: 200,
    headers: {
      "cache-control": "max-age=3600",
      ...headers,
    },
  };
}

function notModified(headers = {}) {
  return {
    data: undefined,
    status: 304,
    headers: {
      "cache-control": "max-age=3600",
      ...headers,
    },
  };
}

function rateLimited(retryAfter) {
  const headers =
    retryAfter !== undefined ? { "retry-after": String(retryAfter) } : {};
  const error = new Error("rate limited");
  error.response = { status: 429, headers, data: { error: "rate limited" } };
  return error;
}

beforeEach(async () => {
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  cachedApi.clearCache();
  cachedApi.resetStats();
  await cachedApi.resetRateLimitState();
});

describe("cache hit/miss", () => {
  it("calls upstream once and serves cached body on the second call", async () => {
    mockApi.get.mockResolvedValueOnce(jsonResponse({ id: 1, name: "iron" }));

    const first = await cachedApi.get("/items/iron");
    const second = await cachedApi.get("/items/iron");

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual({ id: 1, name: "iron" });
    expect(second.data).toEqual({ id: 1, name: "iron" });
    expect(second.fromCache).toBe(true);
  });

  it("differentiates cache entries by query params", async () => {
    mockApi.get
      .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 2 }]));

    const a = await cachedApi.get("/items/search", {
      params: { type: "loot" },
    });
    const b = await cachedApi.get("/items/search", {
      params: { type: "crafted" },
    });

    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(a.data).toEqual([{ id: 1 }]);
    expect(b.data).toEqual([{ id: 2 }]);
  });

  it("treats param object key order as the same key", async () => {
    mockApi.get.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    await cachedApi.get("/items/search", {
      params: { type: "loot", detailed: true },
    });
    await cachedApi.get("/items/search", {
      params: { detailed: true, type: "loot" },
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
  });

  it("respects cache: false opt-out", async () => {
    mockApi.get
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await cachedApi.get("/items/iron", { cache: false });
    await cachedApi.get("/items/iron", { cache: false });

    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});

describe("POST body keying", () => {
  it("caches POST results keyed by body", async () => {
    mockApi.post
      .mockResolvedValueOnce(jsonResponse([{ id: 1 }, { id: 2 }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 3 }]));

    const a1 = await cachedApi.post("/items/multiple", { ids: [1, 2] });
    const a2 = await cachedApi.post("/items/multiple", { ids: [1, 2] });
    const b = await cachedApi.post("/items/multiple", { ids: [3] });

    expect(mockApi.post).toHaveBeenCalledTimes(2);
    expect(a1.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(a2.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(b.data).toEqual([{ id: 3 }]);
  });
});

describe("single-flight dedup", () => {
  it("deduplicates concurrent identical requests into one upstream call", async () => {
    let resolveResponse;
    mockApi.get.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = () => resolve(jsonResponse({ id: 1 }));
      }),
    );

    const a = cachedApi.get("/items/iron");
    const b = cachedApi.get("/items/iron");
    const c = cachedApi.get("/items/iron");

    resolveResponse();

    const [r1, r2, r3] = await Promise.all([a, b, c]);

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(r1.data).toEqual({ id: 1 });
    expect(r2.data).toEqual({ id: 1 });
    expect(r3.data).toEqual({ id: 1 });
  });
});

describe("ETag revalidation", () => {
  it("sends If-None-Match for expired entries with an ETag and serves cached body on 304", async () => {
    mockApi.get.mockResolvedValueOnce(
      jsonResponse(
        { id: 1, name: "iron" },
        { etag: '"abc123"', "cache-control": "max-age=0" },
      ),
    );

    await cachedApi.get("/items/iron");

    expect(mockApi.get).toHaveBeenCalledTimes(1);

    mockApi.get.mockImplementationOnce((_url, config) => {
      expect(config.headers["If-None-Match"]).toBe('"abc123"');
      expect(config.validateStatus(304)).toBe(true);
      return Promise.resolve(notModified({ etag: '"abc123"' }));
    });

    const second = await cachedApi.get("/items/iron");

    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(second.data).toEqual({ id: 1, name: "iron" });
    expect(second.fromCache).toBe(true);
  });
});

describe("429 + Retry-After", () => {
  it("retries after Retry-After seconds and resolves successfully", async () => {
    mockApi.get
      .mockRejectedValueOnce(rateLimited(0))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const response = await cachedApi.get("/items/iron");

    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(response.data).toEqual({ id: 1 });
  });

  it("uses exponential backoff when no Retry-After is present", async () => {
    mockApi.get
      .mockRejectedValueOnce(rateLimited())
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const promise = cachedApi.get("/items/iron");
    const response = await promise;

    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(response.data).toEqual({ id: 1 });
  }, 10000);

  it("surfaces the error after exhausting retries", async () => {
    mockApi.get.mockRejectedValue(rateLimited(0));

    await expect(cachedApi.get("/items/iron")).rejects.toThrow("rate limited");
    expect(mockApi.get).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });
});

describe("binary responses (icons)", () => {
  it("stores binary data in the icon cache and serves it on the second call", async () => {
    const buffer = Buffer.from([1, 2, 3]);
    mockApi.get.mockResolvedValueOnce({
      data: buffer,
      status: 200,
      headers: {
        "cache-control": "max-age=3600",
        "content-type": "image/png",
      },
    });

    const first = await cachedApi.get("/icons/abc", {
      responseType: "arraybuffer",
    });
    const second = await cachedApi.get("/icons/abc", {
      responseType: "arraybuffer",
    });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(first.data).toBe(buffer);
    expect(second.data).toBe(buffer);
    expect(second.headers["content-type"]).toBe("image/png");
  });
});

describe("TTL parsing helpers", () => {
  it("parses max-age from Cache-Control", () => {
    expect(parseMaxAgeMs("max-age=300")).toBe(300_000);
    expect(parseMaxAgeMs("public, max-age=600, must-revalidate")).toBe(600_000);
    expect(parseMaxAgeMs("public, must-revalidate")).toBeNull();
    expect(parseMaxAgeMs(undefined)).toBeNull();
  });

  it("respects explicit max-age, caps at MAX, falls back to DEFAULT when missing", () => {
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(computeTtl({ "cache-control": "max-age=60" })).toBe(60_000);
    expect(computeTtl({ "cache-control": "max-age=0" })).toBe(0);
    expect(computeTtl({ "cache-control": "max-age=99999999" })).toBe(sevenDays);
    expect(computeTtl({ "cache-control": "no-store" })).toBe(0);
    expect(computeTtl({})).toBe(oneDay);
    expect(computeTtl({ "cache-control": "public" })).toBe(oneDay);
  });

  it("parses Retry-After as seconds or HTTP date", () => {
    expect(parseRetryAfterMs({ "retry-after": "5" })).toBe(5000);
    expect(parseRetryAfterMs({ "retry-after": "0" })).toBe(0);
    expect(parseRetryAfterMs({})).toBeNull();
    const future = new Date(Date.now() + 10_000).toUTCString();
    const ms = parseRetryAfterMs({ "retry-after": future });
    expect(ms).toBeGreaterThan(8000);
    expect(ms).toBeLessThanOrEqual(10_000);
  });

  it("stableStringify produces deterministic output regardless of key order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(
      stableStringify({ a: 2, b: 1 }),
    );
    expect(stableStringify({ a: { c: 1, b: 2 } })).toBe(
      stableStringify({ a: { b: 2, c: 1 } }),
    );
  });
});

describe("stats", () => {
  it("tracks hits, misses, and upstream calls", async () => {
    mockApi.get.mockResolvedValue(jsonResponse({ id: 1 }));

    await cachedApi.get("/items/iron");
    await cachedApi.get("/items/iron");
    await cachedApi.get("/items/copper");

    const stats = await cachedApi.getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.upstreamCalls).toBe(2);
  });
});

describe("manual cache access", () => {
  it("can prime and peek a cache entry without going upstream", () => {
    cachedApi.prime(
      "get",
      "/items/iron",
      jsonResponse({ id: 1, name: "iron" }),
    );

    const cached = cachedApi.peek("get", "/items/iron");

    expect(cached).toEqual({
      data: { id: 1, name: "iron" },
      headers: { "cache-control": "max-age=3600" },
      status: 200,
      fromCache: true,
    });
    expect(mockApi.get).not.toHaveBeenCalled();
  });
});

function withRateLimit(data, { limit, remaining, reset, window = 60 }) {
  return jsonResponse(data, {
    ratelimit: `"${limit}-in-1min"; r=${remaining}; t=${reset}`,
    "ratelimit-policy": `"${limit}-in-1min"; q=${limit}; w=${window}; pk=:abc123:`,
  });
}

describe("parseRateLimitHeaders", () => {
  it("parses draft-8 headers (tools server format)", () => {
    expect(
      parseRateLimitHeaders({
        ratelimit: '"300-in-1min"; r=297; t=42',
        "ratelimit-policy": '"300-in-1min"; q=300; w=60; pk=:abc:',
      }),
    ).toEqual({
      remaining: 297,
      resetMs: 42_000,
      limit: 300,
      windowMs: 60_000,
    });
  });

  it("picks the tightest of several draft-8 policies", () => {
    const info = parseRateLimitHeaders({
      ratelimit: '"burst"; r=50; t=5, "minute"; r=10; t=30',
      "ratelimit-policy": '"burst"; q=100; w=10, "minute"; q=300; w=60',
    });
    expect(info.remaining).toBe(10);
    expect(info.resetMs).toBe(30_000);
  });

  it("parses draft-7 and draft-6 headers", () => {
    expect(
      parseRateLimitHeaders({
        ratelimit: "limit=120, remaining=100, reset=30",
        "ratelimit-policy": "120;w=60",
      }),
    ).toEqual({
      remaining: 100,
      resetMs: 30_000,
      limit: 120,
      windowMs: 60_000,
    });
    expect(
      parseRateLimitHeaders({
        "ratelimit-limit": "120",
        "ratelimit-remaining": "5",
        "ratelimit-reset": "10",
      }),
    ).toEqual({ remaining: 5, resetMs: 10_000, limit: 120, windowMs: null });
  });

  it("returns null without rate-limit headers", () => {
    expect(parseRateLimitHeaders({})).toBeNull();
    expect(parseRateLimitHeaders(undefined)).toBeNull();
  });
});

describe("header-driven rate limiting", () => {
  it("adopts the upstream limit and remaining budget", async () => {
    mockApi.get.mockResolvedValueOnce(
      withRateLimit({ id: 1 }, { limit: 300, remaining: 250, reset: 40 }),
    );

    await cachedApi.get("/items/iron");

    const stats = await cachedApi.getCacheStats();
    expect(stats.rateLimitPerMinute).toBe(300);
    expect(stats.reservoir).toBe(250);
    expect(stats.upstreamLimit.headerDriven).toBe(true);
  });

  it("keeps the lowest remaining when responses arrive out of order", async () => {
    mockApi.get
      .mockResolvedValueOnce(
        withRateLimit({ id: 1 }, { limit: 300, remaining: 200, reset: 40 }),
      )
      .mockResolvedValueOnce(
        withRateLimit({ id: 2 }, { limit: 300, remaining: 210, reset: 40 }),
      );

    await cachedApi.get("/items/iron");
    await cachedApi.get("/items/copper");

    expect((await cachedApi.getCacheStats()).reservoir).toBe(200);
  });

  it("follows a limit changed on the API side mid-window", async () => {
    mockApi.get
      .mockResolvedValueOnce(
        withRateLimit({ id: 1 }, { limit: 120, remaining: 10, reset: 40 }),
      )
      .mockResolvedValueOnce(
        withRateLimit({ id: 2 }, { limit: 500, remaining: 390, reset: 40 }),
      );

    await cachedApi.get("/items/iron");
    await cachedApi.get("/items/copper");

    const stats = await cachedApi.getCacheStats();
    expect(stats.rateLimitPerMinute).toBe(500);
    expect(stats.reservoir).toBe(390);
  });

  it("refills to the upstream limit when the window resets", async () => {
    mockApi.get.mockResolvedValueOnce(
      withRateLimit({ id: 1 }, { limit: 300, remaining: 0, reset: 0 }),
    );

    await cachedApi.get("/items/iron");
    expect((await cachedApi.getCacheStats()).reservoir).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 700));
    expect((await cachedApi.getCacheStats()).reservoir).toBe(300);
  });

  it("drains the budget from a 429's headers", async () => {
    const error = rateLimited(0);
    error.response.headers = {
      "retry-after": "0",
      ratelimit: '"300-in-1min"; r=0; t=30',
      "ratelimit-policy": '"300-in-1min"; q=300; w=60',
    };
    mockApi.get
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await cachedApi.get("/items/iron");

    expect((await cachedApi.getCacheStats()).reservoir).toBe(0);
  });
});
