<script setup lang="ts">
import { computed, type Component } from "vue";
import WsLabel from "@/components/primitives/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import RequirementDisplay from "@/components/activity/Info/RequirementDisplay.vue";
import WikiButton from "@/components/common/WikiButton.vue";
import AbilitiesDisplay from "@/components/common/abilities/AbilitiesDisplay.vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import {
  injectBaseContext,
  injectSkillModifiers,
  injectRequirements,
} from "@/composables/context/injectShared";
import { useXpDisplay } from "@/composables/useXpDisplay";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";
import { resolveActivityInputs } from "@/domain/activity/activityInputs";
import type { ActivityDetail } from "@/domain/types/activity";
import type { Requirement } from "@/domain/types/common";

// Shape of a faction-based activity reward
interface FactionActivityReward {
  runtimeType: string;
  faction: string;
  amount: number;
}

interface SectionRow {
  label: string;
  component: Component;
  items: unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemProps: (item: any) => Record<string, unknown>;
  showFineCheckbox?: boolean;
}

const activityStore = useActivityStore();
const playerStore = usePlayerStore();
const dataStore = useDataStore();
const itemsStore = useItemsStore();

const ctx = injectBaseContext();
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
} = injectSkillModifiers();

const { getLevelRequirementsMap } = injectRequirements();

const { xpRewardItems, xpPerStepItems } = useXpDisplay(xpRewards, xpPerStep);

const borderClass = computed(
  () => `border-${ctx.activity.value?.relatedSkillsList[0]}`,
);

const sections = computed(() => {
  const activity = ctx.activity.value as ActivityDetail;
  const { id, workRequired, requirements, rewards, options, abilities } =
    activity;
  const levelRequirementsMap = getLevelRequirementsMap(requirements);

  const isTravel = id === "travelling";
  const showRewards = rewards && rewards.length > 0;

  const inputs = resolveActivityInputs(options, {
    getKeyword: (id) => dataStore.getKeywordById(id),
    materialsById: ctx.materials.value,
    fineMaterialIds: itemsStore.fineMaterials,
  });

  const hasFineInputs =
    inputs.length > 0 && inputs.every(({ canBeFine }) => canBeFine);

  const inputsRow: SectionRow = {
    label: "Inputs",
    component: InfoBubble,
    showFineCheckbox: hasFineInputs,
    items: inputs.map(({ name, icon, quantity, canBeFine }) => ({
      text: `${quantity ? `${quantity} ` : ""}${name}`,
      tooltip: `${quantity ? `${quantity} ` : ""}${name}`,
      iconPath: icon,
      borderClass:
        canBeFine && activityStore.useFineInputs ? "border-fine" : undefined,
    })),
    itemProps: (item) => ({ ...item }),
  };

  const statsRow: SectionRow = {
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
          maxWorkEfficiency.value * 100,
        )}%`,
        tooltip: [
          `Your Work Efficiency: ${Math.round(
            uncappedWorkEfficiency.value * 100,
          )}%`,
          `Max Work Efficiency: ${n(maxWorkEfficiency.value * 100, 0)}%`,
          `Max benefit at: ${
            Math.ceil(effectiveMaxWorkEfficiency.value * 400) / 4
          }%`,
        ].join("\n"),
        iconPath: icons.WE,
        borderClass:
          workEfficiency.value >= effectiveMaxWorkEfficiency.value
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

  const abilitiesRow: SectionRow = {
    label: "Abilities",
    component: AbilitiesDisplay,
    items: abilities ? [1] : [],
    itemProps: () => ({ abilities }),
  };

  if (showRewards) {
    const factionReward = rewards[0] as unknown as FactionActivityReward;
    const rewardsFaction = playerStore.factionsMap[factionReward.faction];
    const stepsPerRep = n((1 / factionReward.amount) * stepsPerAction.value, 0);

    statsRow.items.push({
      text: `+${factionReward.amount} / ${stepsPerRep}`,
      tooltip: `+${factionReward.amount} ${rewardsFaction.name} reputation from action\n${stepsPerRep} steps per full rep`,
      iconPath: rewardsFaction.icon,
      borderClass: `border-${factionReward.faction}`,
    });
  }

  const skillReqsRow: SectionRow = {
    label: "Skill requirements",
    component: SkillBubble,
    items: Object.entries(levelRequirementsMap || {}).map(([skill, level]) => ({
      skill,
      text: level.toString(),
      tooltipText: `Requires ${level} ${skill}`,
    })),
    itemProps: (item) => ({ ...item }),
  };

  const otherReqs: Requirement[] = requirements.filter(
    ({ type }) => type !== "skillLevel",
  );

  const requirementsRow: SectionRow = {
    label: "Requirements",
    component: RequirementDisplay,
    items: otherReqs,
    itemProps: (item) => ({ requirement: item }),
  };

  const xpRewardsRow: SectionRow = {
    label: "XP rewards (current / base)",
    component: SkillBubble,
    items: xpRewardItems.value,
    itemProps: (item) => ({ ...item }),
  };

  const xpPerStepRow: SectionRow = {
    label: "XP per step (real / displayed)",
    component: SkillBubble,
    items: xpPerStepItems.value,
    itemProps: (item) => ({ ...item }),
  };

  const locationsRow: SectionRow = {
    label: "Locations",
    component: LocationBubble,
    items: !isTravel ? (activityStore.locations ?? []) : [],
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
        <wiki-button :name="activityStore.activity?.name ?? ''" />
      </div>
      <div
        v-for="section in sections"
        class="info-section"
        :key="section.label"
      >
        <ws-label :label="section.label" />
        <label v-if="section.showFineCheckbox" class="fine-input-checkbox">
          <input type="checkbox" v-model="activityStore.useFineInputs" />
          Use fine inputs
        </label>
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

.fine-input-checkbox {
  display: flex;
  align-items: center;
  gap: $xs;
  cursor: pointer;
  font-size: 0.85em;
  opacity: 0.85;

  &:hover {
    opacity: 1;
  }
}
</style>
