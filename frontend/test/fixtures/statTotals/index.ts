import type { StatTotals } from "@/domain/effectiveAttrs";

function bucket(sum: number) {
  return { sum, positive: Math.max(0, sum), negative: Math.min(0, sum) };
}

/**
 * Builds a StatTotals object from a plain map of stat keys to flat/percent values.
 * Only the specified stats are populated; all others return 0 via the getStat default.
 */
export function makeStatTotals(
  stats: Record<string, { flat?: number; percent?: number }>,
): StatTotals {
  const result: StatTotals = {};
  for (const [key, { flat = 0, percent = 0 }] of Object.entries(stats)) {
    result[key] = {
      flat: bucket(flat),
      percent: bucket(percent),
    };
  }
  return result;
}

export const emptyStatTotals: StatTotals = {};
