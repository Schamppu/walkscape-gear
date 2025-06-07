<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";
import { isEmpty } from "@/utils/isEmpty";

const props = defineProps({
  activity: Object,
  keywords: Array,
  locations: Array,
});

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

const sections = computed(() => {
  const {
    workRequired,
    maxWorkEfficiency,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
    xpRewardsMap,
  } = props.activity;
  return [
    {
      label: "Info",
      display: "bubbles",
      data: [
        {
          text: workRequired,
          icon: "assets/icons/text/general_icons/steps.png",
        },
        {
          text: `${Math.round(maxWorkEfficiency * 100) - 100}%`,
          icon: "assets/icons/text/stats/skilling/work_efficiency.png",
        },
      ],
    },
    {
      label: "Skill requirements",
      data: levelRequirementsMap,
      display: "skill-bubbles",
    },
    {
      label: "Keyword requirements",
      data: [
        ...(requiredKeywords || []).map(getKeyword),
        ...getRequirementKeywords(requirements),
      ],
      display: "keywords",
    },
    {
      label: "XP rewards (base)",
      data: xpRewardsMap,
      display: "skill-bubbles",
    },
    {
      label: "Locations",
      data: props.locations.map(({ name: text, icon }) => {
        return { text, icon };
      }),
      display: "bubbles",
    },
  ].filter(({ data }) => !isEmpty(data));
});
</script>

<template>
  <section :class="['activity-info', borderClass]">
    <div v-for="section in sections" class="info-section" :key="section.label">
      <ws-label :label="section.label" />
      <div v-if="section.display === 'bubbles'" class="info-row">
        <info-bubble
          v-for="({ text, icon }, index) in section.data"
          :key="index"
          :text="text.toString()"
          :iconPath="icon"
        />
      </div>
      <div v-if="section.display === 'skill-bubbles'" class="info-row">
        <skill-bubble
          v-for="(level, skill) in section.data"
          :key="skill"
          :skill="skill"
          :text="level.toString()"
        />
      </div>
      <div v-if="section.display === 'keywords'" class="info-row">
        <keyword-display
          v-for="(keyword, index) in section.data"
          :key="index"
          :keyword="keyword"
        />
      </div>
    </div>
  </section>
  <!-- {{ activity }} -->
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