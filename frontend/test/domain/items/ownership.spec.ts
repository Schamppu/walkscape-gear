import { describe, it, expect } from "vitest";
import { isOwned } from "@/domain/items/ownership";

describe("isOwned", () => {
  it("is true only when the entry's owned flag is set", () => {
    const ownedItems = {
      ring: { owned: true },
      unowned: { owned: false },
      hidden: { owned: false, hidden: true },
    };

    expect(isOwned(ownedItems, "ring")).toBe(true);
    expect(isOwned(ownedItems, "unowned")).toBe(false);
    expect(isOwned(ownedItems, "hidden")).toBe(false);
    expect(isOwned(ownedItems, "missing")).toBe(false);
  });
});
