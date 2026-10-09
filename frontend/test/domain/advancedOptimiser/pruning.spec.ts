import { describe, it, expect } from "vitest";
import { hasUsefulStat, pruneDominated } from "@/domain/advancedOptimiser/pruning";
import { makeWorkerItem, realmReq, type FixtureStat } from "../../fixtures/advancedOptimiser";

const item = (id: string, stats: FixtureStat[], keywords: string[] = []) =>
  makeWorkerItem(id, stats, { keywords });

const keptIds = (options: Record<string, ReturnType<typeof item>[]>, slotCounts = {}) =>
  Object.fromEntries(
    Object.entries(pruneDominated(options, slotCounts)).map(([k, v]) => [k, v.map((i) => i.id)]),
  );

describe("pruneDominated", () => {
  it("drops an item with less of the same stat", () => {
    const options = {
      head: [
        item("small", [{ type: "workEfficiency", value: 0.1 }]),
        item("big", [{ type: "workEfficiency", value: 0.2 }]),
      ],
    };
    expect(keptIds(options)).toEqual({ head: ["big"] });
  });

  it("treats fewer steps required as better", () => {
    const options = {
      feet: [
        item("minus5", [{ type: "stepsRequired", value: -5, isPercent: false }]),
        item("minus2", [{ type: "stepsRequired", value: -2, isPercent: false }]),
      ],
    };
    expect(keptIds(options)).toEqual({ feet: ["minus5"] });
  });

  it("doesn't let an item with an extra penalty dominate", () => {
    const options = {
      head: [
        item("plain", [{ type: "doubleAction", value: 0.1 }]),
        item("tradeoff", [
          { type: "doubleAction", value: 0.2 },
          { type: "workEfficiency", value: -0.1 },
        ]),
      ],
    };
    expect(keptIds(options)).toEqual({ head: ["plain", "tradeoff"] });
  });

  it("compares conditional stats only with the same condition", () => {
    const realmOnly = makeWorkerItem("realm_hat", [], {
      conditional: [{ stats: [{ type: "workEfficiency", value: 0.5 }], requirements: [realmReq("syrenthia")] }],
    });
    const options = { head: [realmOnly, item("plain", [{ type: "workEfficiency", value: 0.1 }])] };
    expect(keptIds(options)).toEqual({ head: ["realm_hat", "plain"] });
  });

  it("never drops an item for one without its keywords", () => {
    const options = {
      head: [
        item("set_piece", [{ type: "workEfficiency", value: 0.1 }], ["treasure"]),
        item("better", [{ type: "workEfficiency", value: 0.3 }]),
      ],
    };
    expect(keptIds(options)).toEqual({ head: ["set_piece", "better"] });
  });

  it("drops an item for one with a superset of its keywords", () => {
    const options = {
      head: [
        item("worse", [{ type: "workEfficiency", value: 0.1 }], ["treasure"]),
        item("better", [{ type: "workEfficiency", value: 0.3 }], ["treasure", "hat"]),
      ],
    };
    expect(keptIds(options)).toEqual({ head: ["better"] });
  });

  it("keeps as many items as there are slots of that type", () => {
    const options = {
      ring: [1, 2, 3].map((n) => item(`ring${n}`, [{ type: "workEfficiency", value: n / 10 }])),
    };
    expect(keptIds(options, { ring: 2 })).toEqual({ ring: ["ring2", "ring3"] });
  });

  it("requires equal keywords for multi-slot types", () => {
    const options = {
      ring: [
        item("plain", [{ type: "workEfficiency", value: 0.1 }]),
        item("gold", [{ type: "workEfficiency", value: 0.3 }], ["gold_ring"]),
        item("gold2", [{ type: "workEfficiency", value: 0.3 }], ["gold_ring"]),
      ],
    };
    expect(keptIds(options, { ring: 2 })).toEqual({ ring: ["plain", "gold", "gold2"] });
  });

  it("ignores stats that aren't useful", () => {
    const options = {
      back: [
        item("bag", [
          { type: "workEfficiency", value: 0.1 },
          { type: "inventorySpace", value: 5, isPercent: false },
        ]),
        item("better", [{ type: "workEfficiency", value: 0.2 }]),
      ],
    };
    const kept = pruneDominated(options, {}, (stat) => stat.type === "workEfficiency");
    expect(kept.back.map((i) => i.id)).toEqual(["better"]);
  });

  it("keeps identical items", () => {
    const stats = [{ type: "workEfficiency", value: 0.1 }];
    expect(keptIds({ head: [item("a", stats), item("b", stats)] })).toEqual({ head: ["a", "b"] });
  });
});

describe("hasUsefulStat", () => {
  const useful = new Set(["workEfficiency", "doubleAction"]);

  it("needs a helpful stat among the useful ones", () => {
    expect(hasUsefulStat(item("good", [{ type: "workEfficiency", value: 0.1 }]), useful)).toBe(true);
    expect(hasUsefulStat(item("penalty", [{ type: "workEfficiency", value: -0.1 }]), useful)).toBe(false);
    expect(hasUsefulStat(item("other", [{ type: "inventorySpace", value: 5 }]), useful)).toBe(false);
  });

  it("counts conditional stats", () => {
    const realmOnly = makeWorkerItem("realm_hat", [], {
      conditional: [{ stats: [{ type: "doubleAction", value: 0.1 }], requirements: [realmReq("syrenthia")] }],
    });
    expect(hasUsefulStat(realmOnly, useful)).toBe(true);
  });

  it("treats fewer steps required as helpful", () => {
    const steps = new Set(["stepsRequired"]);
    expect(hasUsefulStat(item("boots", [{ type: "stepsRequired", value: -2, isPercent: false }]), steps)).toBe(true);
  });
});
