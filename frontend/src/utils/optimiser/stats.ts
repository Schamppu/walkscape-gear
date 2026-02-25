import { computed } from "vue";
import { priorityValue } from "./priority";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import useBaseContext from "@/composables/context/useBaseContext";
import { filterUsefulStats } from "@/domain/optimiser/scoring";
import type { GearSet, OptimiserItem } from "./types";
import type { XpPerStep } from "@/domain/skillModifiers";

export { filterUsefulStats };

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

