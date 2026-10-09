import { describe, it, expect } from "vitest";
import {
  buildDynCtx,
  filterMultislot,
  preFilterStaticEntries,
  requirementsMet,
} from "@/domain/optimiser/setRequirements";
import {
  keywordEquippedReq,
  locationKeywordsReq,
  makeAttrEntry,
  makeLocationSummary,
  makeReqCtx,
  makeWorkerItem,
  realmReq,
  setBonusReq,
} from "../../fixtures/advancedOptimiser";

const sCtx = makeReqCtx();
const dynFor = (items = [makeWorkerItem("a")], location = makeLocationSummary("loc")) =>
  buildDynCtx(items, location, sCtx);

describe("requirementsMet", () => {
  it("passes with no requirements", () => {
    expect(requirementsMet([], sCtx, dynFor())).toBe(true);
    expect(requirementsMet(null, sCtx, dynFor())).toBe(true);
  });

  it("counts keyword items for set bonuses", () => {
    const piece = (id: string) => makeWorkerItem(id, [], { keywords: ["treasure"] });
    const twoPieces = dynFor([piece("a"), piece("b")]);
    const threePieces = dynFor([piece("a"), piece("b"), piece("c")]);
    expect(requirementsMet([setBonusReq("treasure", 3)], sCtx, twoPieces)).toBe(false);
    expect(requirementsMet([setBonusReq("treasure", 3)], sCtx, threePieces)).toBe(true);
  });

  it("checks keywordEquipped and its opposite", () => {
    const withRod = dynFor([makeWorkerItem("rod", [], { keywords: ["fishing_rod"] })]);
    expect(requirementsMet([keywordEquippedReq("fishing_rod")], sCtx, withRod)).toBe(true);
    expect(requirementsMet([keywordEquippedReq("fishing_rod", true)], sCtx, withRod)).toBe(false);
    expect(requirementsMet([keywordEquippedReq("fishing_rod")], sCtx, dynFor())).toBe(false);
  });

  it("checks realm against the set's location", () => {
    const inSyrenthia = dynFor([], makeLocationSummary("deep", "syrenthia"));
    const inJarvonia = dynFor([], makeLocationSummary("town", "jarvonia"));
    expect(requirementsMet([realmReq("syrenthia")], sCtx, inSyrenthia)).toBe(true);
    expect(requirementsMet([realmReq("syrenthia")], sCtx, inJarvonia)).toBe(false);
  });

  it("checks location keywords against the set's location", () => {
    const underwater = dynFor([], makeLocationSummary("reef", "syrenthia", ["underwater"]));
    expect(requirementsMet([locationKeywordsReq(["underwater"])], sCtx, underwater)).toBe(true);
    expect(requirementsMet([locationKeywordsReq(["underwater"])], sCtx, dynFor())).toBe(false);
  });

  it("falls back to the static location when the set has none", () => {
    const ctx = makeReqCtx({ locationFaction: "syrenthia" });
    const dyn = buildDynCtx([], null, ctx);
    expect(requirementsMet([realmReq("syrenthia")], ctx, dyn)).toBe(true);
  });
});

describe("preFilterStaticEntries", () => {
  it("keeps only entries whose requirements hold with no gear", () => {
    const always = makeAttrEntry("always", [{ type: "workEfficiency", value: 0.1 }]);
    const realmOnly = makeAttrEntry("realm", [{ type: "workEfficiency", value: 0.1 }], [
      realmReq("syrenthia"),
    ]);
    const ctx = makeReqCtx({ locationFaction: "jarvonia" });
    expect(preFilterStaticEntries([always, realmOnly], ctx)).toEqual([always]);
  });
});

describe("filterMultislot", () => {
  const ringA = makeWorkerItem("ring_a", [], { keywords: ["gold_ring"] });
  const ringB = makeWorkerItem("ring_b", [], { keywords: ["silver_ring"] });
  const keywordsMap = { gold_ring: { bannedKeywords: ["silver_ring"] } };

  it("doesn't offer an item already in another slot of the same type", () => {
    const options = filterMultislot({ ring1: ringA }, [ringA, ringB], "ring", "ring2", {});
    expect(options).toEqual([ringB]);
  });

  it("removes items banned by an equipped item's keywords", () => {
    const options = filterMultislot({ ring1: ringA }, [ringA, ringB], "ring", "ring2", keywordsMap);
    expect(options).toEqual([]);
  });

  it("applies banned keywords from locked items", () => {
    const options = filterMultislot({}, [ringB], "ring", "ring2", keywordsMap, ["gold_ring"]);
    expect(options).toEqual([]);
  });
});
