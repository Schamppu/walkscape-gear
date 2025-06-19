<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";
import { useEffectiveAttrs } from "@/utils/useEffectiveAttrs";
import { isEmpty } from "@/utils/isEmpty";

const props = defineProps({
  activity: Object,
  keywords: Array,
  locations: Array,
});

const { totalsByStat } = useEffectiveAttrs();

const borderClass = computed(
  () => `border-${props.activity?.relatedSkillsList[0]}`
);

const getKeyword = (kw) => {
  const findKw = (kwId) => props.keywords.find(({ id }) => id === kwId);

  if ("keyword" in kw) {
    return findKw(kw["keyword"]);
  } else if ("keywords" in kw) {
    const { quantity, keywords } = kw;
    return keywords.map((kwId) => {
      return { ...findKw(kwId), quantity };
    });
  }
  return null;
};

const getRequirementKeywords = (requirements) => {
  if (!requirements) return [];
  return requirements
    .flatMap((requirements) => requirements)
    .filter(({ type }) => type === "distinctKeywordItemsEquipped")
    .flatMap(({ requirement }) => getKeyword(requirement));
};

const getStat = (stat, key = "percent") => {
  return stat in totalsByStat.value
    ? key in totalsByStat.value[stat]
      ? totalsByStat.value[stat][key]
      : 0
    : 0;
};

const sections = computed(() => {
  const {
    id,
    workRequired,
    maxWorkEfficiency,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
    xpRewardsMap,
  } = props.activity;

  const isTravel = id === "activity-travelling";
  const we = Math.min(getStat("workEfficiency"), maxWorkEfficiency - 1);
  const stepsRequired = getStat("stepsRequired", "flat");
  const steps = Math.max(
    10,
    Math.ceil((workRequired || 1000) / (1 + we)) + stepsRequired
  );

  const flatXp = getStat("bonusExperience", "flat");
  const percentXp = getStat("bonusExperience");
  const xpRewardsArr = Object.entries(xpRewardsMap).map(([skill, base]) => {
    const current = (1 + percentXp) * base + flatXp;
    return {
      skill,
      base,
      current,
    };
  });

  let xpRewards = [...xpRewardsArr];
  if (xpRewardsArr.length > 1) {
    const totalBase = xpRewardsArr.reduce((sum, r) => sum + r.base, 0);
    const totalCurrent = xpRewardsArr.reduce((sum, r) => sum + r.current, 0);
    xpRewards.push({
      skill: "xp",
      base: totalBase,
      current: totalCurrent,
    });
  }

  return [
    {
      label: "Stats (current / base)",
      component: InfoBubble,
      items: [
        {
          text: `${steps} / ${workRequired || 1000}`,
          iconPath: "assets/icons/text/general_icons/steps.png",
        },
        {
          text: `${Math.round(we * 100)} / ${
            Math.round(maxWorkEfficiency * 100) - 100
          }%`,
          iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
        },
      ],
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Skill requirements",
      component: SkillBubble,
      items: Object.entries(levelRequirementsMap || {}).map(
        ([skill, level]) => ({
          skill,
          text: level.toString(),
          tooltipText: `Requires ${level} ${skill}`,
        })
      ),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Keyword requirements",
      component: KeywordDisplay,
      items: [
        ...(requiredKeywords || []).map(getKeyword),
        ...getRequirementKeywords(requirements),
      ],
      itemProps: (keyword) => ({ keyword }),
    },
    {
      label: "XP rewards (current / base)",
      component: SkillBubble,
      items: xpRewards.map(({ skill, current, base }) => ({
        skill,
        text: `${Math.round(100 * current) / 100} / ${base}`,
        tooltipText: `Rewards ${Math.round(100 * current) / 100} ${skill} XP`,
        current,
        base,
      })),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Locations",
      component: LocationBubble,
      items: !isTravel ? props.locations : [],
      itemProps: (item) => ({ location: item }),
    },
  ].filter(({ items }) => !isEmpty(items));
});
</script>

<template>
  <section :class="['activity-info', borderClass]">
    <div v-for="section in sections" class="info-section" :key="section.label">
      <ws-label :label="section.label" />
      <div class="info-row">
        <component
          v-for="(item, idx) in section.items"
          :is="section.component"
          v-bind="section.itemProps(item)"
          :key="idx"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.activity-info {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: $sm;
  align-items: flex-start;

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
