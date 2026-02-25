import { computed } from "vue";
import { priorityValue } from "./priority";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";
import type { GearSet, OptimiserItem } from "./types";
import type { XpPerStep } from "@/domain/skillModifiers";

export const getGearSetStats = (set: GearSet): number => {
  const baseCtx = useBaseContext();

  const { location, ...items } = set;

  const gearCtx = {
    ...baseCtx,
    location: computed(() => (location ? location : baseCtx.location.value)),
    equippedGear: computed(
      () =>
        Object.values(items as Record<string, OptimiserItem | null | undefined>).filter(
          Boolean,
        ) as OptimiserItem[],
    ),
  } as unknown as SkillModifiersContext;

  const stats = useSkillModifiers(gearCtx);
  const prio = priorityValue();

  if (prio === "stepsPerRewardRoll") return stats.stepsPerRewardRoll.value;
  if (prio === "xpPerStep") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    return xp[xp.length - 1].value;
  }
  if (prio === "craftsPerMaterial") return stats.craftsPerMaterial.value;
  if (prio === "stepsPerFineRoll") return stats.stepsPerFineRoll.value;
  if (prio === "stepsPerCollectibleRoll") return stats.stepsPerCollectibleRoll.value;

  // fallback
  return stats.stepsPerRewardRoll.value;
};

export const filterUsefulStats = (
  items: OptimiserItem[],
  target = "stepsPerRewardRoll",
): OptimiserItem[] => {
  const baseStats = ["work_efficiency", "double_action", "steps_required"];
  const usefulStatsByTarget: Record<string, string[]> = {
    stepsPerRewardRoll: [...baseStats, "double_rewards"],
    xpPerStep: [...baseStats, "bonus_experience"],
    stepsPerFineRoll: [...baseStats, "double_rewards", "fine_material_finding"],
    stepsPerCollectibleRoll: [...baseStats, "double_rewards", "find_collectibles"],
    craftsPerMaterial: [...baseStats, "double_rewards", "no_materials_consumed"],
  };

  if (!(target in usefulStatsByTarget)) {
    console.warn(`${target} not set in usefulStatsByTarget`);
    return items;
  }

  const targetStats = usefulStatsByTarget[target];
  return items.filter(
    ({ usefulStats }) =>
      usefulStats.filter(
        ({ stat, isNegative }) => !isNegative && targetStats.includes(stat),
      ).length > 0,
  );
};
