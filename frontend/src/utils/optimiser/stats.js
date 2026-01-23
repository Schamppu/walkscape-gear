import { computed } from "vue";
import { selectedPriority } from "./priority";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";

export const getGearSetStats = (set) => {
  const baseCtx = useBaseContext();

  const { location, ...items } = set;

  const gearCtx = {
    ...baseCtx,
    location: computed(() => (location ? location : baseCtx.location.value)),
    equippedGear: computed(() => [...Object.values(items).filter(Boolean)]),
  };

  const stats = useSkillModifiers(gearCtx);
  const prio = selectedPriority(baseCtx);
  if (prio === "stepsPerRewardRoll") return stats.stepsPerRewardRoll.value;
  else if (prio === "xpPerStep") {
    const xp = stats.xpPerStep.value;
    return xp[xp.length - 1].value;
  } else if (prio === "craftsPerMaterial") {
    return stats.craftsPerMaterial.value;
  } else if (prio === "stepsPerFineRoll") {
    return stats.stepsPerFineRoll.value;
  } else if (prio === "stepsPerCollectibleRoll") {
    return stats.stepsPerCollectibleRoll.value;
  }
  // fallback
  return stats.stepsPerRewardRoll.value;
};

export const filterUsefulStats = (items, target = "stepsPerRewardRoll") => {
  const baseStats = ["work_efficiency", "double_action", "steps_required"];
  const usefulStatsByTarget = {
    stepsPerRewardRoll: [...baseStats, "double_rewards"],
    xpPerStep: [...baseStats, "bonus_experience"],
    stepsPerFineRoll: [...baseStats, "double_rewards", "fine_material_finding"],
    stepsPerCollectibleRoll: [
      ...baseStats,
      "double_rewards",
      "find_collectibles",
    ],
    craftsPerMaterial: [
      ...baseStats,
      "double_rewards",
      "no_materials_consumed",
    ],
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
