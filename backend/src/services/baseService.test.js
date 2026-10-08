import { beforeEach, describe, expect, it, vi } from "vitest";

const cachedApiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  peek: vi.fn(),
  prime: vi.fn(),
}));

vi.mock("./cachedApi.js", () => ({
  default: cachedApiMock,
}));

const { default: BaseService } = await import("./baseService.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BaseService.getMultiple", () => {
  it("reuses cached single-item entries and batch-fetches only misses", async () => {
    const service = new BaseService("items");

    cachedApiMock.peek.mockImplementation((_method, url) => {
      if (url === "/items/1") {
        return {
          data: { id: 1, name: "one" },
          headers: {},
          status: 200,
          fromCache: true,
        };
      }

      return null;
    });

    cachedApiMock.post.mockResolvedValue({
      data: [
        { id: 2, name: "two" },
        { id: 3, name: "three" },
      ],
      headers: { "cache-control": "max-age=3600" },
      status: 200,
    });

    const result = await service.getMultiple([1, 2, 3, 2]);

    expect(cachedApiMock.post).toHaveBeenCalledWith(
      "/items/multiple",
      { ids: [2, 3] },
      { responseType: "json" },
    );
    expect(cachedApiMock.prime).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: 1, name: "one" },
      { id: 2, name: "two" },
      { id: 3, name: "three" },
      { id: 2, name: "two" },
    ]);
  });

  it("falls back to individual fetches when batch endpoints are unsupported", async () => {
    const service = new BaseService("locations");

    cachedApiMock.peek.mockReturnValue(null);
    cachedApiMock.post.mockRejectedValue({ response: { status: 404 } });
    cachedApiMock.get
      .mockResolvedValueOnce({ data: { id: "alpha" } })
      .mockResolvedValueOnce({ data: { id: "beta" } })
      .mockResolvedValueOnce({ data: { id: "beta" } });

    const first = await service.getMultiple(["alpha", "beta"]);
    const second = await service.getMultiple(["beta"]);

    expect(cachedApiMock.post).toHaveBeenCalledTimes(1);
    expect(cachedApiMock.get).toHaveBeenCalledTimes(3);
    expect(first).toEqual([{ id: "alpha" }, { id: "beta" }]);
    expect(second).toEqual([{ id: "beta" }]);
  });

  it("backfills individually when the batch response is partial", async () => {
    const service = new BaseService("pets");

    cachedApiMock.peek.mockReturnValue(null);
    cachedApiMock.post.mockResolvedValue({
      data: [{ id: "cat" }],
      headers: {},
      status: 200,
    });
    cachedApiMock.get.mockResolvedValueOnce({ data: { id: "dog" } });

    const result = await service.getMultiple(["cat", "dog"]);

    expect(cachedApiMock.get).toHaveBeenCalledWith("/pets/dog");
    expect(result).toEqual([{ id: "cat" }, { id: "dog" }]);
  });
});