<script setup>
import { computed } from "vue";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";

const props = defineProps({
  itemAttrs: Array,
  qualityAttrs: Array,
  buffs: Array,
  quality: String,
});

const attrs = sumAttrs(
  toDeepRaw(props.itemAttrs),
  toDeepRaw(props.qualityAttrs),
  toDeepRaw(props.buffs),
  props.quality
);

const getStatText = (stat) => {
  const { value, isPercent, name } = stat;

  const sign = value < 0 ? "" : "+";
  const percent = isPercent ? "%" : "";
  const val = isPercent
    ? Math.round(10000 * value) / 100
    : Math.round(100 * value) / 100;

  return `${sign}${val}${percent} ${name}`;
};

const getRequirementText = (base, requirements) => {
  if (!requirements.length) return `Global ${base}`;

  const reqTypes = requirements.flatMap(({ type }) => type);
  let text = !reqTypes.includes("mainSkill") ? `Global ${base}` : base;

  const reqToText = (prev, req) => {
    const { type, opposite, requirement } = req;
    const { value, skill, keywordNames, quantity, realmName } = requirement;
    const not = opposite ? "NOT " : "";
    if (type === "achievementPoint")
      return `${prev} when ${value} Achievement Points`;
    else if (type === "traveling") return `${prev} while traveling`;
    else if (type === "mainSkill") return `${prev} while ${skill}`;
    else if (type === "distinctKeywordItemsEquipped")
      return `${prev} if you have ${quantity} ${keywordNames[0]} equipped`;
    else if (type === "locationHasKeywords")
      return `${prev} while ${not}in ${keywordNames[0]} area`;
    else if (type === "realm")
      return `${prev} while ${not}in the ${realmName} area`;
    return prev;
  };

  requirements.forEach((r) => {
    text = reqToText(text, r);
  });

  return text;
};

const attributeText = (attr) => {
  const { stats, requirements } = attr;
  const [stat, ..._] = stats;
  const statText = getStatText(stat);
  const reqText = getRequirementText(statText, requirements || []);

  return reqText;
};

const colorClass = computed(() => {
  return `border-${props.quality}`;
});
</script>

<template>
  <ul :class="['stats', colorClass]">
    <li v-for="attr in attrs" :key="attr.textLocalizationKey">
      {{ attributeText(attr) }}
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.stats {
  border-radius: $md;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $xs;
  list-style-type: none;
  padding: $sm;

  li {
    text-align: left;
  }
}
</style>
