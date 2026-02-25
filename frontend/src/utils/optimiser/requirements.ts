import { priorityValue } from "./priority";
import {
  handledReqTypes,
  isHandledRequirement,
  getReq,
  contributesToReq,
  filterItemsForReq,
  getRequirementCandidates as _getRequirementCandidates,
} from "@/domain/optimiser/requirements";
import type {
  HandledReqType,
  KeywordReq,
  AbilityReq,
  Req,
  HandledRequirement,
  RequirementCandidate,
} from "@/domain/optimiser/requirements";
import type { OptimiserItem } from "./types";

export type { HandledReqType, KeywordReq, AbilityReq, Req, HandledRequirement, RequirementCandidate };
export { handledReqTypes, isHandledRequirement, getReq, contributesToReq, filterItemsForReq };

/**
 * Wrapper that injects the active priority from the settings store so
 * callers do not need to read it themselves.
 */
export const getRequirementCandidates = (
  gearOptions: Record<string, OptimiserItem[]>,
  req: Req,
): RequirementCandidate[] => _getRequirementCandidates(gearOptions, req, priorityValue());

