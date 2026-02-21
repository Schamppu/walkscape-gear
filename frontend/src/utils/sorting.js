import { qualityOptions } from "@/domain/constants/quality.ts";

const qualityRank = Object.fromEntries(
  qualityOptions.map(({ value }, index) => [value, index])
);

export function itemQualityNameSort(a, b, reverseQuality = false) {
  const aRank = qualityRank[a.quality] ?? Infinity;
  const bRank = qualityRank[b.quality] ?? Infinity;

  if (aRank !== bRank) {
    return reverseQuality ? bRank - aRank : aRank - bRank;
  }

  return a.name.localeCompare(b.name);
}

export function levelReqNameSort(a, b, reverse = false) {
  const { requirements: aReqs } = a;
  const { requirements: bReqs } = b;

  function getMaxSkillLevel(reqs) {
    if (!Array.isArray(reqs) || reqs.length === 0) return 0;
    const skillLevels = reqs
      .filter(
        (r) =>
          r.type === "skillLevel" &&
          r.requirement &&
          typeof r.requirement.level === "number"
      )
      .map((r) => r.requirement.level);
    return skillLevels.length ? Math.max(...skillLevels) : 0;
  }

  const aLevel = getMaxSkillLevel(aReqs);
  const bLevel = getMaxSkillLevel(bReqs);

  if (aLevel !== bLevel) {
    return reverse ? bLevel - aLevel : aLevel - bLevel;
  }

  return a.name.localeCompare(b.name);
}
