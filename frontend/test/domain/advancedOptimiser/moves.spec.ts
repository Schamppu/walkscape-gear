import { describe, it, expect } from "vitest";
import {
  collectSetKeywords,
  countSlots,
  pairMoves,
  perturb,
  setMoves,
  singleMoves,
  type MoveContext,
} from "@/domain/advancedOptimiser/moves";
import {
  keywordEquippedReq,
  makeLocationSummary,
  makeWorkerItem,
  seededRandom,
  setBonusReq,
} from "../../fixtures/advancedOptimiser";

const hatA = makeWorkerItem("hat_a");
const hatB = makeWorkerItem("hat_b");
const ringA = makeWorkerItem("ring_a");
const ringB = makeWorkerItem("ring_b");

const ctx = (overrides: Partial<MoveContext> = {}): MoveContext => ({
  slots: ["head", "ring1", "ring2"],
  options: { head: [hatA, hatB], ring: [ringA, ringB] },
  locations: [],
  keywordsMap: {},
  setKeywords: [],
  ...overrides,
});

const ids = (set: Record<string, unknown>) =>
  Object.entries(set)
    .filter(([, v]) => v)
    .map(([slot, v]) => `${slot}=${(v as { id: string }).id}`)
    .sort()
    .join(",");

describe("singleMoves", () => {
  it("swaps, empties and fills single slots without duplicating rings", () => {
    const set = { head: hatA, ring1: ringA };
    const moves = [...singleMoves(set, ctx())].map(ids);
    expect(moves).toEqual(
      expect.arrayContaining([
        "ring1=ring_a", // head emptied
        "head=hat_b,ring1=ring_a",
        "head=hat_a", // ring1 emptied
        "head=hat_a,ring1=ring_b",
        "head=hat_a,ring1=ring_a,ring2=ring_b",
      ]),
    );
    expect(moves).not.toContain("head=hat_a,ring1=ring_a,ring2=ring_a");
    expect(new Set(moves).size).toBe(moves.length);
  });

  it("tries other locations", () => {
    const town = makeLocationSummary("town");
    const reef = makeLocationSummary("reef", "syrenthia");
    const moves = [...singleMoves({ location: town }, ctx({ slots: [], locations: [town, reef] }))];
    expect(moves).toEqual([{ location: reef }]);
  });

  it("never touches slots outside the search", () => {
    const locked = makeWorkerItem("locked_hat");
    for (const set of singleMoves({ head: locked }, ctx({ slots: ["ring1"] }))) {
      expect(set.head).toBe(locked);
    }
  });
});

describe("setMoves", () => {
  const piece = (id: string) => makeWorkerItem(id, [], { keywords: ["treasure"] });

  it("equips a piece of the set in every slot that has one", () => {
    const context = ctx({
      slots: ["head", "chest", "legs"],
      options: {
        head: [hatA, piece("t_hat")],
        chest: [piece("t_chest")],
        legs: [makeWorkerItem("plain_legs")],
      },
      setKeywords: ["treasure"],
    });
    const [move] = [...setMoves({ head: hatA }, context, () => 0)];
    expect(ids(move)).toBe("chest=t_chest,head=t_hat");
  });

  it("yields nothing when the set is already complete", () => {
    const context = ctx({
      slots: ["head"],
      options: { head: [piece("t_hat")] },
      setKeywords: ["treasure"],
    });
    expect([...setMoves({ head: piece("t_hat") }, context, () => 0)]).toEqual([]);
  });
});

describe("collectSetKeywords", () => {
  it("finds keywords used by set bonuses and keyword requirements", () => {
    const options = {
      head: [
        makeWorkerItem("t_hat", [], {
          conditional: [{ stats: [{ type: "doubleAction", value: 0.1 }], requirements: [setBonusReq("treasure", 3)] }],
        }),
        makeWorkerItem("lamp", [], {
          conditional: [{ stats: [{ type: "workEfficiency", value: 0.1 }], requirements: [keywordEquippedReq("light")] }],
        }),
      ],
    };
    expect(collectSetKeywords(options).sort()).toEqual(["light", "treasure"]);
  });
});

describe("pairMoves and perturb", () => {
  it("pair moves change exactly two slots", () => {
    const set = { head: hatA, ring1: ringA };
    for (const move of pairMoves(set, ctx(), 20, seededRandom(3))) {
      const changed = ["head", "ring1", "ring2"].filter((s) => move[s] !== set[s as keyof typeof set]);
      expect(changed).toHaveLength(2);
    }
  });

  it("perturb only changes search slots", () => {
    const locked = makeWorkerItem("locked_hat");
    const next = perturb({ head: locked }, ctx({ slots: ["ring1", "ring2"] }), 5, seededRandom(7));
    expect(next.head).toBe(locked);
  });
});

describe("countSlots", () => {
  it("counts slots per type", () => {
    expect(countSlots(["head", "ring1", "ring2", "tool1"])).toEqual({ head: 1, ring: 2, tool: 1 });
  });
});
