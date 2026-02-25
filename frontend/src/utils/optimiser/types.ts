/**
 * Re-exports optimiser types from the domain layer.
 * Utils and composable code should import from here; domain code imports
 * directly from "@/domain/optimiser/types".
 */
export type {
  MappedItem,
  OptimiserItem,
  GearSet,
  SlotOptions,
  GearOptions,
  Candidate,
  FulfilledCandidate,
} from "@/domain/optimiser/types";

