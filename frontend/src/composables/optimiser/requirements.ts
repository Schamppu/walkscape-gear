import { priorityValue } from "./priority";
import {
  getRequirementCandidates as _getRequirementCandidates,
} from "@/domain/optimiser/requirements";
import type { Req, RequirementCandidate } from "@/domain/optimiser/requirements";
import type { OptimiserItem } from "@/domain/optimiser/types";
import { usePlayerStore } from "@/store/player";

/**
 * Wrapper that injects the active priority and character level from stores so
 * callers do not need to read them themselves.
 */
export const getRequirementCandidates = (
  gearOptions: Record<string, OptimiserItem[]>,
  req: Req,
): RequirementCandidate[] => {
  const playerStore = usePlayerStore();
  return _getRequirementCandidates(gearOptions, req, priorityValue(), playerStore.level);
};
