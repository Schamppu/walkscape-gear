import { priorityValue } from "./priority";
import {
  isHighStat as _isHighStat,
  startScore as _startScore,
  compareScore as _compareScore,
} from "@/domain/optimiser/scoring";
import { getGearSetStats } from "./stats";
import type { MappedItem, OptimiserItem } from "./types";

export const isHighStat = (): boolean => _isHighStat(priorityValue());

export const startScore = (): number => _startScore(priorityValue());

export const compareScore = (value: number, best: number): number =>
  _compareScore(value, best, priorityValue());

export const getItemScores = (
  slot: string,
  items: MappedItem[],
  baseScore: number,
): OptimiserItem[] =>
  items.map((item) => ({
    ...item,
    score: compareScore(
      getGearSetStats({ [slot]: item as OptimiserItem }),
      baseScore,
    ),
  }));

