import useBaseContext from "@/composables/context/useBaseContext";
import { useRequirements } from "@/composables/useRequirements";
import { compareScore } from "./score";
import { slotMax } from "./gear";

export const getReq = ({ type, requirement }) => {
  if (type === "keywordEquipped") {
    return {
      keyword: requirement.keyword,
      quantity: 1,
      level: 1,
    };
  } else if (type === "distinctKeywordItemsEquipped") {
    return {
      keyword: requirement.keywords[0],
      quantity: requirement.quantity,
      level: 1,
    };
  } else if (type === "keywordWithLevelEquipped") {
    return {
      keyword: requirement.keyword,
      quantity: 1,
      level: requirement.level,
    };
  } else if (type === "abilityAvailable") {
    return {
      ability: requirement.ability,
      quantity: 1,
      level: 1,
    };
  }
};

function contributesToReq(item, req) {
  if (!item) return 0;

  if ("keyword" in req) {
    if (!item.keywords.includes(req.keyword)) return 0;
    if (req.level && item.level < req.level) return 0;

    return 1;
  } else if ("ability" in req) {
    return 1;
  }
}

export const filterItemsForReq = (req, items) => {
  const baseCtx = useBaseContext();
  const { getLevelRequirementsMap } = useRequirements(baseCtx);
  return items.filter((item) => {
    if ("keyword" in req) {
      return (
        item.keywords?.includes(req.keyword) &&
        (req.level > 1
          ? Object.values(getLevelRequirementsMap(item.requirements))[0] >
            req.level
          : true)
      );
    } else if ("ability" in req && "abilities" in item) {
      const itemAbilityNames = item.abilities
        .flatMap((abilityVal) => {
          if (typeof abilityVal === "string") return abilityVal;
          const { quality } = item;
          const { ability, unlockLevel } = abilityVal;
          return quality >= unlockLevel ? ability : null;
        })
        .filter((value) => value);
      return itemAbilityNames.includes(req.ability);
    }
  });
};

export function getRequirementCandidates(gearOptions, req) {
  const result = [];

  for (const [slotKey, items] of Object.entries(gearOptions)) {
    const max = slotMax(slotKey);

    for (let i = 1; i <= max; i++) {
      const slotName = max > 1 ? `${slotKey}${i}` : slotKey;

      for (const item of items) {
        if (contributesToReq(item, req)) {
          result.push({ slotName, slotKey, item });
        }
      }
    }
  }

  return result.sort((a, b) => compareScore(a.item.score, b.item.score));
}
