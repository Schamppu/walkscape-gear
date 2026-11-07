import { describe, it, expect } from "vitest";
import { isReactive, reactive } from "vue";
import { toDeepRaw } from "@/utils/rawData";

describe("toDeepRaw", () => {
  it("returns a deep copy with no reactive proxies", () => {
    const state = reactive({
      item: { id: "ring", attrs: [{ stat: "luck", value: 2 }] },
    });

    const copy = toDeepRaw(state);

    expect(isReactive(copy)).toBe(false);
    expect(isReactive(copy.item)).toBe(false);
    expect(isReactive(copy.item.attrs[0])).toBe(false);
    expect(copy).toEqual({ item: { id: "ring", attrs: [{ stat: "luck", value: 2 }] } });
  });

  it("does not modify or alias the source", () => {
    const source = { nested: { list: [{ a: 1 }] } };
    const nestedBefore = source.nested;
    const listBefore = source.nested.list;
    const state = reactive({ source });

    const copy = toDeepRaw(state);
    copy.source.nested.list[0].a = 99;

    expect(source.nested).toBe(nestedBefore);
    expect(source.nested.list).toBe(listBefore);
    expect(source.nested.list[0].a).toBe(1);
  });

  it("unwraps reactive objects nested inside plain objects", () => {
    const inner = reactive({ value: 1 });
    const copy = toDeepRaw({ inner });

    expect(isReactive(copy.inner)).toBe(false);
    expect(copy.inner).not.toBe(inner);
  });

  it("copies Maps, Sets and primitives", () => {
    const data = { map: new Map([["a", 1]]), set: new Set([1]), n: 3, s: "x", none: null };
    const copy = toDeepRaw(data);

    expect(copy.map).not.toBe(data.map);
    expect(copy.map.get("a")).toBe(1);
    expect(copy.set.has(1)).toBe(true);
    expect(copy.n).toBe(3);
    expect(copy.s).toBe("x");
    expect(copy.none).toBeNull();
  });
});
