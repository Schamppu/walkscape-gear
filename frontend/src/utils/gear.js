import { getRawData } from "./rawData";
import { sumAttrs } from "./qualityAttrs";
import { useRequirements } from "./useRequirements";

export const showItemForActivity = (
  itemProxy,
  activity,
  service,
  quality,
  isRecipe
) => {
  const item = getRawData(itemProxy);

  const [skill] = activity.relatedSkillsList ??
    activity.relatedSkills ?? [null];
  const skillReq = checksSkillRequirements(item, skill);

  const hasUsefulKeywords = usefulKeywords(item, activity, service).length > 0;
  const hasUsefulAttrs =
    usefulAttrs(item, activity, quality, isRecipe).length > 0;
  const hasTables = itemTables(item).length > 0;

  return (
    !skill ||
    (skill && (skillReq || hasUsefulKeywords || hasUsefulAttrs || hasTables))
  );
};

const usefulKeywords = (item, activity, service) => {
  if (!activity) return false;
  const { requiredKeywords: kw, requirements } = activity;
  const serviceRequirements = service?.requirements || [];

  const kws = kw?.map(({ keyword }) => keyword) ?? [];
  const kwEquipped =
    [...requirements, ...serviceRequirements]
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
    item.buffs || [],
    quality
  );

  const filterCO = (attr) => {
    return isRecipe || (!isRecipe && attr.statText !== "Crafting outcome");
  };

  const { checkRequirements } = useRequirements();
  const usefulAttr = baseAttrs.filter(
    (attr) =>
      filterCO(attr) &&
      checkRequirements(attr.requirements) &&
      attr.stats.some((stat) => !stat.isNegative)
  );
  return usefulAttr;
};

const itemTables = (item) => {
  return item.tables || [];
};

const checksSkillRequirements = (item, skill) => {
  const skillReqs = skillsInRequirements(item);
  const requiredSkills = skillReqs.map(({ requirement }) => requirement.skill);
  const usesSkill = requiredSkills.includes(skill);
  return usesSkill;
};

const skillsInRequirements = (item) => {
  const { requirements } = item;
  if (!requirements) return [];

  return requirements.filter((req) => req.type === "skillLevel");
};
