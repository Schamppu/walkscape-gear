import { getRawData } from "./rawData";
import { sumAttrs } from "./qualityAttrs";
import { useRequirements } from "./useRequirements";

export const showItemForActivity = (itemProxy, activity, quality) => {
  const item = getRawData(itemProxy);

  const skill = activity?.relatedSkillsList.length
    ? activity.relatedSkillsList[0]
    : null;
  const skillReq = checksSkillRequirements(item, skill);

  const hasUsefulKeywords = usefulKeywords(item, activity).length > 0;
  const hasUsefulAttrs = usefulAttrs(item, activity, quality, false).length > 0;

  return !skill || (skill && (skillReq || hasUsefulKeywords || hasUsefulAttrs));
};

const usefulKeywords = (item, activity) => {
  if (!activity) return false;
  const { requiredKeywords: kw, requirements } = activity;

  const kws = kw?.map(({ keyword }) => keyword) ?? [];
  const kwEquipped =
    requirements
      ?.filter((req) => req.type === "distinctKeywordItemsEquipped")
      .flatMap(({ requirement }) => requirement.keywords) ?? [];

  if (!(kws || kwEquipped)) return false;
  return item.keywords.filter(
    (keyword) => kws.includes(keyword) || kwEquipped.includes(keyword)
  );
};

const usefulAttrs = (item, activity, quality, isRecipe) => {
  const baseAttrs = sumAttrs(
    item.itemAttrs,
    item.itemQualityAttrs || [],
    quality
  );

  const isTravel = activity?.id === "activity-travelling";
  const skill = activity?.relatedSkillsList.length
    ? activity.relatedSkillsList[0]
    : null;

  const filterCO = (attr) => {
    return isRecipe || (!isRecipe && attr.statText !== "Crafting outcome");
  };

  const { checkRequirements } = useRequirements();
  return baseAttrs.filter(
    (attr) => filterCO(attr) && checkRequirements(attr.requirements)
  );
};

const checksSkillRequirements = (item, skill) => {
  const skillReqs = skillsInRequirements(item);
  const requiredSkills = skillReqs.map(({ skill }) => skill);
  const usesSkill = requiredSkills.includes(skill);
  return usesSkill;
};

const skillsInRequirements = (item) => {
  const { requirements } = item;
  if (!requirements) return [];

  return requirements.filter((req) => req.type === "skillLevel");
};
