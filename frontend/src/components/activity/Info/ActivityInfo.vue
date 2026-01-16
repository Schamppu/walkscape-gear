<script setup>
import { computed } from "vue";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import RequirementDisplay from "@/components/activity/Info/RequirementDisplay.vue";
import WikiButton from "@/components/common/WikiButton.vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useSkillModifiers } from "@/composables/useSkillModifiers";

import useBaseContext from "@/composables/context/useBaseContext";
import { useRequirements } from "@/composables/useRequirements";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";
import AbilitiesDisplay from "../../common/abilities/AbilitiesDisplay.vue";
import { icons } from "@/constants/iconPaths";

const activityStore = useActivityStore();
const playerStore = usePlayerStore();

const ctx = useBaseContext();
const {
  maxWorkEfficiency,
  workEfficiency,
  uncappedWorkEfficiency,
  effectiveMaxWorkEfficiency,
  stepsPerAction,
  stepsPerRewardRoll,
  uncappedStepsPerCompletion,
  stepsPerCompletion,
  xpRewards,
  xpPerStep,
} = useSkillModifiers(ctx);

const { getLevelRequirementsMap } = useRequirements(ctx);

const borderClass = computed(
  () => `border-${ctx.activity.value?.relatedSkillsList[0]}`
);

const sections = computed(() => {
  const { id, workRequired, requirements, rewards, options, abilities } =
    ctx.activity.value;
  const levelRequirementsMap = getLevelRequirementsMap(requirements);

  const isTravel = id === "travelling";
  const showRewards = rewards && rewards.length > 0;

  const inputs =
    options
      ?.filter(Boolean)
      ?.filter(({ type }) => type === "inputActivity")
      .flatMap(({ inputs }) => inputs)
      .map(({ item, quantity }) => {
        const itemObj = ctx.materials.value[item];
        const { name, icon } = itemObj;

        return {
          name,
          icon,
          quantity,
        };
      }) || [];
  const inputsRow = {
    label: "Inputs",
    component: InfoBubble,
    items: inputs.map(({ name, icon, quantity }) => ({
      text: `${quantity}`,
      tooltip: `${quantity} ${name}`,
      iconPath: icon,
    })),
    itemProps: (item) => ({ ...item }),
  };

  const statsRow = {
    label: "Stats (current / base)",
    component: InfoBubble,
    items: [
      {
        text: `${n(stepsPerCompletion.value)}${
          uncappedStepsPerCompletion.value !== stepsPerCompletion.value
            ? ` (${n(uncappedStepsPerCompletion.value)})`
            : ""
        } / ${n(workRequired || 1000)}`,
        tooltip: `${n(stepsPerCompletion.value)} steps per action`,
        iconPath: icons.steps,
      },
      {
        text: `${n(uncappedWorkEfficiency.value * 100)} / ${Math.round(
          (maxWorkEfficiency.value - 1) * 100
        )}%`,
        tooltip: [
          `Your Work Efficiency: ${Math.round(
            uncappedWorkEfficiency.value * 100
          )}%`,
          `Max Work Efficiency: ${n((maxWorkEfficiency.value - 1) * 100, 0)}%`,
          `Max benefit at: ${
            Math.ceil((effectiveMaxWorkEfficiency.value - 1) * 400) / 4
          }%`,
        ].join("\n"),
        iconPath: icons.WE,
        borderClass:
          workEfficiency.value >= effectiveMaxWorkEfficiency.value - 1
            ? "border-green"
            : "",
      },
      {
        text: `${n(stepsPerRewardRoll.value, 2)}`,
        tooltip: `Steps per reward roll: ${n(stepsPerRewardRoll.value, 2)}`,
        iconPath: icons.DR,
      },
    ],
    itemProps: (item) => ({ ...item }),
  };

  const abilitiesRow = {
    label: "Abilities",
    component: AbilitiesDisplay,
    items: abilities ? [1] : [],
    itemProps: () => ({ abilities }),
  };

  if (showRewards) {
    const rewardsFaction = playerStore.factionsMap[rewards[0].faction];
    const stepsPerRep = n((1 / rewards[0].amount) * stepsPerAction.value, 0);

    statsRow.items.push({
      text: `+${rewards[0].amount} / ${stepsPerRep}`,
      tooltip: `+${rewards[0].amount} ${rewardsFaction.name} reputation from action\n${stepsPerRep} steps per full rep`,
      iconPath: rewardsFaction.icon,
      borderClass: `border-${rewardsFaction.id}`,
    });
  }

  const skillReqsRow = {
    label: "Skill requirements",
    component: SkillBubble,
    items: Object.entries(levelRequirementsMap || {}).map(([skill, level]) => ({
      skill,
      text: level.toString(),
      tooltipText: `Requires ${level} ${skill}`,
    })),
    itemProps: (item) => ({ ...item }),
  };

  const otherReqs = requirements.filter(({ type }) => type !== "skillLevel");

  const requirementsRow = {
    label: "Requirements",
    component: RequirementDisplay,
    items: otherReqs,
    itemProps: (item) => {
      return {
        requirement: item,
      };
    },
  };

  const xpRewardsRow = {
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
  };

  const xpPerStepRow = {
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
  };

  const locationsRow = {
    label: "Locations",
    component: LocationBubble,
    items: !isTravel ? activityStore.locations : [],
    itemProps: (item) => ({ location: item }),
  };

  return [
    inputsRow,
    statsRow,
    abilitiesRow,
    skillReqsRow,
    requirementsRow,
    xpRewardsRow,
    xpPerStepRow,
    locationsRow,
  ].filter(({ items }) => !isEmpty(items));
});
</script>

<template>
  <details open>
    <summary>Activity Info</summary>

    <section
      :class="['activity-info', borderClass]"
      :key="activityStore.activity?.id"
    >
      <div class="info-section">
        <wiki-button :name="activityStore.activity?.name" />
      </div>
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
