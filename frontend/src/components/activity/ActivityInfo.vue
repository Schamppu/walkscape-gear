<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import EquippedKeywordDisplay from "@/components/common/EquippedKeywordDisplay.vue";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";

const activityStore = useActivityStore();
const dataStore = useDataStore();

const {
  maxWorkEfficiency,
  workEfficiency,
  uncappedWorkEfficiency,
  effectiveMaxWorkEfficiency,
  stepsPerCompletion,
  xpRewards,
  xpPerStep,
} = useSkillModifiers();

const borderClass = computed(
  () => `border-${activityStore.activity?.relatedSkillsList[0]}`
);

const getKeyword = (kw) => {
  if ("id" in kw) {
    return dataStore.getKeywordById(kw["id"]);
  } else if ("keywords" in kw) {
    const { quantity, keywords } = kw;
    return keywords.map((kwId) => {
      return { ...dataStore.getKeywordById(kwId), quantity };
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
    id,
    workRequired,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
  } = activityStore.activity;

  const isTravel = id === "travelling";

  return [
    {
      label: "Stats (current / base)",
      component: InfoBubble,
      items: [
        {
          text: `${stepsPerCompletion.value} / ${workRequired || 1000}`,
          tooltip: `${stepsPerCompletion.value} steps per action`,
          iconPath: "assets/icons/text/general_icons/steps.png",
        },
        {
          text: `${n(uncappedWorkEfficiency.value * 100)} / ${Math.round(
            (maxWorkEfficiency.value - 1) * 100
          )}%`,
          tooltip: `Your Work Efficiency: ${Math.round(
            uncappedWorkEfficiency.value * 100
          )}%\nMax Work Efficiency: ${n(
            (maxWorkEfficiency.value - 1) * 100,
            0
          )}%\nMax benefit at: ${
            Math.ceil((effectiveMaxWorkEfficiency.value - 1) * 400) / 4
          }%`,
          iconPath: "assets/icons/text/stats/skilling/work_efficiency.png",
          borderClass:
            workEfficiency.value >= effectiveMaxWorkEfficiency.value - 1
              ? "border-green"
              : "",
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
      component: EquippedKeywordDisplay,
      items: [
        ...(requiredKeywords || []).map(getKeyword),
        ...getRequirementKeywords(requirements),
      ],
      itemProps: (keyword) => ({ keyword }),
    },
    {
      label: "XP rewards (current / base)",
      component: SkillBubble,
      items: xpRewards.value.map(({ skill, skillText, value, base }) => ({
        skill,
        text: `${n(value)} / ${n(base)}`,
        tooltipText: `Rewards ${n(value)} ${skillText} XP`,
        value,
        base,
      })),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "XP per step (real / displayed)",
      component: SkillBubble,
      items: xpPerStep.value.map(
        ({ skill, skillText, value, displayedValue }) => ({
          skill,
          text: `${n(value)} /  ${n(displayedValue)}`,
          tooltip: `Gains ${n(value)} ${skillText} XP per step`,
        })
      ),
      itemProps: (item) => ({ ...item }),
    },
    {
      label: "Locations",
      component: LocationBubble,
      items: !isTravel ? activityStore.locations : [],
      itemProps: (item) => ({ location: item }),
    },
  ].filter(({ items }) => !isEmpty(items));
});
</script>

<template>
  <details open>
    <summary>Activity Info</summary>

    <section :class="['activity-info', borderClass]">
      <div
        v-for="section in sections"
        class="info-section"
        :key="section.label"
      >
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
  </details>
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
