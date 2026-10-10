import { describe, it, expect } from "vitest";
import {
  extractExperienceAction,
  buildMemosphereDefs,
  computeMemosphereXp,
  type MemosphereDef,
} from "@/domain/drops/memosphereXp";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { AbilityDetail } from "@/domain/types/ability";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function memosphereAbility(skill: string, timesLevel = 20): Pick<AbilityDetail, "data"> {
  return {
    data: [
      {
        dataType: "normal",
        actions: [
          {
            type: "experience",
            runtimeType: "experience",
            experienceType: "timesLevel",
            skill,
            flat: null,
            percent: null,
            timesLevel,
          },
        ],
      },
    ],
  } as Pick<AbilityDetail, "data">;
}

function memosphereItem(skill: string) {
  return {
    id: `${skill}_memosphere`,
    icon: `icons/memosphere_${skill}.png`,
    abilities: [`memosphere:_${skill}`],
  };
}

function def(skill: string, xpPerLevel = 20): MemosphereDef {
  return {
    itemId: `${skill}_memosphere`,
    icon: `icons/memosphere_${skill}.png`,
    skill,
    xpPerLevel,
  };
}

function dropInfo(id: string, stepsPerItem: number): DropItemInfo {
  return {
    id,
    icon: undefined,
    sources: [],
    totalDropChance: 0,
    stepsPerItem,
    itemsPerStep: 1000 / stepsPerItem,
    stepsPerNormal: stepsPerItem,
    stepsPerFine: Infinity,
    stepsPerRare: Infinity,
    dropCounts: "1",
    variableRequirement: null,
  };
}

// ---------------------------------------------------------------------------
// extractExperienceAction
// ---------------------------------------------------------------------------

describe("extractExperienceAction", () => {
  it("returns the timesLevel experience action", () => {
    const action = extractExperienceAction(memosphereAbility("woodcutting"));
    expect(action?.skill).toBe("woodcutting");
    expect(action?.timesLevel).toBe(20);
  });

  it("returns null for abilities without an experience action", () => {
    expect(extractExperienceAction(null)).toBeNull();
    expect(
      extractExperienceAction({
        data: [{ dataType: "normal", actions: [] }],
      } as Pick<AbilityDetail, "data">),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildMemosphereDefs
// ---------------------------------------------------------------------------

describe("buildMemosphereDefs", () => {
  it("resolves items to their ability's skill and xp per level", () => {
    const defs = buildMemosphereDefs(
      [memosphereItem("woodcutting"), memosphereItem("trinketry")],
      {
        "memosphere:_woodcutting": memosphereAbility("woodcutting"),
        "memosphere:_trinketry": memosphereAbility("trinketry"),
      },
    );
    expect(defs).toEqual({
      woodcutting_memosphere: def("woodcutting"),
      trinketry_memosphere: def("trinketry"),
    });
  });

  it("skips items whose ability detail isn't loaded", () => {
    const defs = buildMemosphereDefs([memosphereItem("agility")], {});
    expect(defs).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// computeMemosphereXp
// ---------------------------------------------------------------------------

describe("computeMemosphereXp", () => {
  const defs = {
    trinketry_memosphere: def("trinketry"),
    woodcutting_memosphere: def("woodcutting"),
  };

  it("scales by the player's skill level", () => {
    const { total, breakdown } = computeMemosphereXp(
      [{ trinketry_memosphere: dropInfo("trinketry_memosphere", 1000) }],
      defs,
      { trinketry: 80 },
    );
    // 1600 xp per sphere, one sphere per 1000 steps
    expect(total).toBeCloseTo(1.6);
    expect(breakdown).toEqual([
      {
        icon: "icons/memosphere_trinketry.png",
        label: "trinketry_memosphere",
        value: expect.closeTo(1.6),
      },
    ]);
  });

  it("sums rates across drop maps and ignores non-memospheres", () => {
    const { total, breakdown } = computeMemosphereXp(
      [
        { woodcutting_memosphere: dropInfo("woodcutting_memosphere", 2000), log: dropInfo("log", 10) },
        { woodcutting_memosphere: dropInfo("woodcutting_memosphere", 2000) },
        { trinketry_memosphere: dropInfo("trinketry_memosphere", 4000) },
      ],
      defs,
      { woodcutting: 50, trinketry: 100 },
    );
    // woodcutting: 2/2000 × 1000 = 1; trinketry: 1/4000 × 2000 = 0.5
    expect(breakdown.map((l) => l.label)).toEqual([
      "woodcutting_memosphere",
      "trinketry_memosphere",
    ]);
    expect(breakdown[0].value).toBeCloseTo(1);
    expect(breakdown[1].value).toBeCloseTo(0.5);
    expect(total).toBeCloseTo(1.5);
  });

  it("defaults missing skill levels to 1", () => {
    const { total } = computeMemosphereXp(
      [{ trinketry_memosphere: dropInfo("trinketry_memosphere", 20) }],
      defs,
      {},
    );
    expect(total).toBeCloseTo(1);
  });

  it("ignores zero and non-finite steps", () => {
    const { total, breakdown } = computeMemosphereXp(
      [
        { trinketry_memosphere: dropInfo("trinketry_memosphere", 0) },
        { woodcutting_memosphere: dropInfo("woodcutting_memosphere", Infinity) },
      ],
      defs,
      { trinketry: 10, woodcutting: 10 },
    );
    expect(total).toBe(0);
    expect(breakdown).toEqual([]);
  });
});
