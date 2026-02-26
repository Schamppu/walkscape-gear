import { computed } from "vue";
import { priorityValue } from "./priority";
import {
  useSkillModifiers,
  type SkillModifiersContext,
} from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";
import type { GearSet, OptimiserItem } from "@/domain/optimiser/types";
import type { XpPerStep } from "@/domain/skillModifiers";

export const getGearSetStats = (set: GearSet): number => {
  const baseCtx = useBaseContext();

  const { location, ...items } = set;

  const gearCtx = {
    ...baseCtx,
    location: computed(() => (location ? location : baseCtx.location.value)),
    equippedGear: computed(
      () =>
        Object.values(
          items as Record<string, OptimiserItem | null | undefined>,
        ).filter(Boolean) as OptimiserItem[],
    ),
  } as unknown as SkillModifiersContext;

  const stats = useSkillModifiers(gearCtx);
  const prio = priorityValue();

  if (prio === "stepsPerRewardRoll") return stats.stepsPerRewardRoll.value;
  if (prio === "balanced") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    const xpValue = xp[xp.length - 1]?.value ?? 1;
    return stats.stepsPerRewardRoll.value / Math.sqrt(xpValue > 0 ? xpValue : 1);
  }
  if (prio === "xpPerStep") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    return xp[xp.length - 1].value;
  }
  if (prio === "craftsPerMaterial") return stats.craftsPerMaterial.value;
  if (prio === "balancedRecipe") {
    const xp = stats.xpPerStep.value as XpPerStep[];
    const xpValue = xp[xp.length - 1]?.value ?? 1;
    return stats.craftsPerMaterial.value * (xpValue > 0 ? xpValue : 1);
  }
  if (prio === "stepsPerFineRoll") return stats.stepsPerFineRoll.value;
  if (prio === "stepsPerCollectibleRoll")
    return stats.stepsPerCollectibleRoll.value;

  // fallback
  return stats.stepsPerRewardRoll.value;
};
