import { describe, it, expect } from "vitest";
import {
  resolvePetAbilityAttrs,
  attachPetAbilityAttrs,
  abilityAttributes,
  unlockedAbilityIds,
  type AbilityAttrContext,
  type AbilitySource,
} from "@/domain/abilities/petAbilityAttrs";
import type { Attribute, Stat } from "@/domain/types/item";
import type { PetAbility } from "@/domain/types/pet";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeStat = (over: Partial<Stat> = {}): Stat => ({
  stat: "workEfficiency",
  name: "Work Efficiency",
  type: "workEfficiency",
  isPercent: false,
  value: 5,
  isNegative: false,
  isMultiplicative: false,
  ...over,
});

const makeAttr = (over: Partial<Attribute> = {}): Attribute => ({
  id: "attr-1",
  customIcon: null,
  customTextLocalizationKey: null,
  customText: "+5 Work Efficiency",
  textLocalizationKey: "",
  text: "+5 Work Efficiency",
  statText: "+5 WE",
  skillText: "",
  tables: null,
  requirements: [],
  stats: [makeStat()],
  ...over,
});

const summary = (
  id: string,
  type: string,
  over: Partial<AbilitySource> = {},
): AbilitySource => ({
  id,
  name: `${id}-name`,
  icon: `${id}.png`,
  type,
  ...over,
});

const pet = (abilities: PetAbility[]) => ({ abilities });

const makeCtx = (over: Partial<AbilityAttrContext> = {}): AbilityAttrContext => ({
  attrsById: {},
  summaryById: {},
  disabledActiveAbilityIds: new Set<string>(),
  ...over,
});

// ---------------------------------------------------------------------------
// resolvePetAbilityAttrs
// ---------------------------------------------------------------------------

describe("resolvePetAbilityAttrs", () => {
  it("returns [] for a pet with no abilities", () => {
    expect(resolvePetAbilityAttrs({}, 10, makeCtx())).toEqual([]);
    expect(resolvePetAbilityAttrs(pet([]), 10, makeCtx())).toEqual([]);
  });

  it("includes a passive ability's attributes tagged with the ability as source", () => {
    const ctx = makeCtx({
      summaryById: { passive_a: summary("passive_a", "passive") },
      attrsById: { passive_a: [makeAttr()] },
    });
    const attrs = resolvePetAbilityAttrs(
      pet([{ unlockLevel: 1, ability: "passive_a" }]),
      5,
      ctx,
    );
    expect(attrs).toHaveLength(1);
    expect(attrs[0].sourceItem).toEqual({
      id: "passive_a",
      name: "passive_a-name",
      icon: "passive_a.png",
    });
    expect(attrs[0].stats[0].value).toBe(5);
  });

  it("includes an active ability by default (enabled unless toggled off)", () => {
    const ctx = makeCtx({
      summaryById: { active_a: summary("active_a", "active") },
      attrsById: { active_a: [makeAttr()] },
    });
    expect(
      resolvePetAbilityAttrs(pet([{ unlockLevel: 1, ability: "active_a" }]), 5, ctx),
    ).toHaveLength(1);
  });

  it("excludes an active ability that has been toggled off", () => {
    const ctx = makeCtx({
      summaryById: { active_a: summary("active_a", "active") },
      attrsById: { active_a: [makeAttr()] },
      disabledActiveAbilityIds: new Set(["active_a"]),
    });
    expect(
      resolvePetAbilityAttrs(pet([{ unlockLevel: 1, ability: "active_a" }]), 5, ctx),
    ).toEqual([]);
  });

  it("still includes a passive ability even if its id is in the disabled set", () => {
    const ctx = makeCtx({
      summaryById: { passive_a: summary("passive_a", "passive") },
      attrsById: { passive_a: [makeAttr()] },
      disabledActiveAbilityIds: new Set(["passive_a"]),
    });
    expect(
      resolvePetAbilityAttrs(pet([{ unlockLevel: 1, ability: "passive_a" }]), 5, ctx),
    ).toHaveLength(1);
  });

  it("excludes abilities not yet unlocked at the pet's level", () => {
    const ctx = makeCtx({
      summaryById: { passive_a: summary("passive_a", "passive") },
      attrsById: { passive_a: [makeAttr()] },
    });
    expect(
      resolvePetAbilityAttrs(pet([{ unlockLevel: 8, ability: "passive_a" }]), 5, ctx),
    ).toEqual([]);
  });

  it("skips abilities missing a summary", () => {
    const ctx = makeCtx({ attrsById: { ghost: [makeAttr()] } });
    expect(
      resolvePetAbilityAttrs(pet([{ unlockLevel: 1, ability: "ghost" }]), 5, ctx),
    ).toEqual([]);
  });

  it("preserves rollSpecialTable attributes (pseudo-stat handling happens downstream)", () => {
    const rollAttr = makeAttr({
      tables: [{ tableID: "t1" }] as unknown as Attribute["tables"],
      stats: [makeStat({ type: "rollSpecialTable", stat: "rollSpecialTable" })],
    });
    const ctx = makeCtx({
      summaryById: { passive_a: summary("passive_a", "passive") },
      attrsById: { passive_a: [rollAttr] },
    });
    const attrs = resolvePetAbilityAttrs(
      pet([{ unlockLevel: 1, ability: "passive_a" }]),
      5,
      ctx,
    );
    expect(attrs).toHaveLength(1);
    expect(attrs[0].stats[0].type).toBe("rollSpecialTable");
    expect(attrs[0].tables).toEqual([{ tableID: "t1" }]);
  });
});

// ---------------------------------------------------------------------------
// attachPetAbilityAttrs
// ---------------------------------------------------------------------------

describe("attachPetAbilityAttrs", () => {
  const ctx = makeCtx({
    summaryById: { passive_a: summary("passive_a", "passive") },
    attrsById: { passive_a: [makeAttr()] },
  });

  it("returns non-pet items unchanged", () => {
    const gear = { id: "sword", itemAttrs: [], quality: "common" };
    expect(attachPetAbilityAttrs(gear, ctx)).toBe(gear);
  });

  it("attaches abilityAttrs to a pet at the level implied by its quality", () => {
    const petItem = {
      id: "camel",
      egg: {},
      abilities: [{ unlockLevel: 3, ability: "passive_a" }],
      quality: "5",
    };
    const result = attachPetAbilityAttrs(petItem, ctx) as typeof petItem & {
      abilityAttrs?: Attribute[];
    };
    expect(result).not.toBe(petItem);
    expect(result.abilityAttrs).toHaveLength(1);
    expect(result.abilityAttrs?.[0].sourceItem?.id).toBe("passive_a");
  });

  it("leaves a pet unchanged when it contributes no ability attributes", () => {
    const petItem = {
      id: "camel",
      egg: {},
      abilities: [{ unlockLevel: 9, ability: "passive_a" }],
      quality: "5",
    };
    expect(attachPetAbilityAttrs(petItem, ctx)).toBe(petItem);
  });
});

// ---------------------------------------------------------------------------
// abilityAttributes
// ---------------------------------------------------------------------------

describe("abilityAttributes", () => {
  it("returns [] for null/undefined", () => {
    expect(abilityAttributes(null)).toEqual([]);
    expect(abilityAttributes(undefined)).toEqual([]);
  });

  it("returns root attributes for a passive ability", () => {
    const detail = { attributes: [makeAttr({ id: "root" })], data: [] };
    const attrs = abilityAttributes(detail);
    expect(attrs.map((a) => a.id)).toEqual(["root"]);
  });

  it("returns nested attributes from effect actions for an active ability", () => {
    const detail = {
      attributes: [],
      data: [
        {
          dataType: "abilityData",
          actions: [
            { type: "other", runtimeType: "x", attributes: [makeAttr({ id: "ignored" })] },
            { type: "effect", runtimeType: "y", attributes: [makeAttr({ id: "eff1" })] },
          ],
        },
      ],
    };
    const attrs = abilityAttributes(detail);
    expect(attrs.map((a) => a.id)).toEqual(["eff1"]);
  });

  it("combines root and effect-action attributes", () => {
    const detail = {
      attributes: [makeAttr({ id: "root" })],
      data: [
        {
          dataType: "abilityData",
          actions: [{ type: "effect", runtimeType: "y", attributes: [makeAttr({ id: "eff1" })] }],
        },
      ],
    };
    expect(abilityAttributes(detail).map((a) => a.id)).toEqual(["root", "eff1"]);
  });
});

// ---------------------------------------------------------------------------
// unlockedAbilityIds
// ---------------------------------------------------------------------------

describe("unlockedAbilityIds", () => {
  it("returns [] for null/empty pets", () => {
    expect(unlockedAbilityIds(null, 10)).toEqual([]);
    expect(unlockedAbilityIds(undefined, 10)).toEqual([]);
    expect(unlockedAbilityIds({ abilities: [] }, 10)).toEqual([]);
  });

  it("returns only abilities unlocked at or below the given level", () => {
    const p = pet([
      { unlockLevel: 1, ability: "a" },
      { unlockLevel: 5, ability: "b" },
      { unlockLevel: 9, ability: "c" },
    ]);
    expect(unlockedAbilityIds(p, 5)).toEqual(["a", "b"]);
  });
});
