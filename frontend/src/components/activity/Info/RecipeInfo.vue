<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import WsLabel from "@/components/primitives/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import ServiceBubble from "@/components/common/ServiceBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import RealmSelection from "./RealmSelection.vue";
import RequirementDisplay from "@/components/activity/Info/RequirementDisplay.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import WikiButton from "@/components/common/WikiButton.vue";
import QualityOutcomeTable from "./QualityOutcomeTable.vue";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import {
  injectBaseContext,
  injectSkillModifiers,
  injectFineMaterials,
} from "@/composables/context/injectShared";
import { useXpDisplay } from "@/composables/useXpDisplay";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";

const activityStore = useActivityStore();
const itemsStore = useItemsStore();

const { recipe } = storeToRefs(activityStore);
const ctx = injectBaseContext();
const { xpRewardsMultiplier, fineMode, useFine } =
  injectFineMaterials();

const sharedModifiers = injectSkillModifiers();

const { xpRewardItems, xpPerStepItems } = useXpDisplay(
  sharedModifiers.xpRewards,
  sharedModifiers.xpPerStep,
  xpRewardsMultiplier,
);

const stats = computed(() => {
  return {
    maxWorkEfficiency: sharedModifiers.maxWorkEfficiency.value,
    workEfficiency: sharedModifiers.workEfficiency.value,
    uncappedWorkEfficiency: sharedModifiers.uncappedWorkEfficiency.value,
    effectiveMaxWorkEfficiency:
      sharedModifiers.effectiveMaxWorkEfficiency.value,
    qualityOutcome: sharedModifiers.qualityOutcome.value,
    uncappedStepsPerCompletion:
      sharedModifiers.uncappedStepsPerCompletion.value,
    stepsPerCompletion: sharedModifiers.stepsPerCompletion.value,
    stepsPerRewardRoll: sharedModifiers.stepsPerRewardRoll.value,
    craftsPerMaterial: sharedModifiers.craftsPerMaterial.value,
  };
});

const levelRequirement = computed(() => {
  const [level] = recipe.value.requirements
    .filter(({ type }) => type === "skillLevel")
    .map(({ requirement }) => requirement);
  return level || { level: 1, skill: "none" };
});

const borderClass = computed(
  () => `border-${activityStore.recipe?.relatedSkills[0]}`,
);

const sections = computed(() => {
  const serviceRequirements = ctx.recipe.value.requirements.filter(
    ({ type }) => type === "service",
  );
  if (serviceRequirements.length) {
    return [
      {
        label: "Services",
        component: ServiceBubble,
        items: activityStore.services,
        itemProps: (item) => ({ service: item }),
      },
      {
        label: "Service Requirements",
        component: RequirementDisplay,
        items: activityStore.service?.requirements ?? [],
        itemProps: (item) => ({ requirement: item }),
      },
      {
        label: "Locations",
        component: LocationBubble,
        items: activityStore.locations,
        itemProps: (item) => ({ location: item }),
      },
    ].filter(({ items }) => !isEmpty(items));
  }
  return [
    {
      label: "Location",
      component: RealmSelection,
      items: [null],
      itemProps: () => {},
    },
  ];
});

const resultHasCO = computed(() => {
  const [itemId] = Object.keys(recipe.value.itemRewards);
  return (
    itemId in itemsStore.allGearItems &&
    itemsStore.allGearItems[itemId].type === "crafted"
  );
});

const materials = computed(() => {
  return recipe.value.materials.map(({ options }) =>
    options
      .map(({ item, amount }) => {
        if (!(item in itemsStore.allGearItems || item in itemsStore.materials))
          return;

        const fullItem =
          itemsStore.allGearItems[item] || itemsStore.materials[item];
        const { name, icon } = fullItem;
        return {
          id: item,
          name,
          icon,
          amount,
        };
      })
      .filter(({ name }) => name),
  );
});

const wikiLink = computed(() => {
  const { name, itemRewards } = activityStore.recipe;
  if (name.toLowerCase() === "upcycle trash") return "Upcycle_Trash";
  return `${Object.keys(itemRewards || {})[0]}#Recipes`;
});

const rewardCount = computed(() => {
  const { itemRewards } = recipe.value;
  return Object.values(itemRewards)[0];
});
</script>

<template>
  <details open>
    <summary>Recipe Info</summary>
    <section :class="['recipe-info', borderClass]">
      <div class="info-section" :key="recipe">
        <div class="info-row">
          <label>
            <input type="checkbox" v-model="activityStore.useFineMaterials" />
            Fine Materials
          </label>
          <wiki-button :name="wikiLink" />
        </div>
        <div class="info-row">
          <p>Materials:</p>
          <div
            v-for="(materialGroup, gi) in materials"
            :key="`material-${gi}`"
            class="material-group"
          >
            <template
              v-for="({ id, name, icon, amount }, index) in materialGroup"
              :key="name"
            >
              <p v-if="index > 0">or</p>
              <info-bubble
                :text="`${amount}`"
                :tooltip="`${amount}x ${name}`"
                :iconPath="icon"
                :border-class="useFine && itemsStore.fineMaterials[id] ? 'border-fine' : ''"
              />
            </template>
          </div>
        </div>
        <div v-if="rewardCount > 1" class="info-row">
          <p>Output: {{ rewardCount }}</p>
        </div>

        <div class="info-row">
          <info-bubble
            label="item"
            :text="`${n(stats.stepsPerRewardRoll / rewardCount, 2)}`"
            :tooltip="`${n(
              stats.stepsPerRewardRoll / rewardCount,
              2,
            )} steps per item`"
            iconPath="assets/icons/text/general_icons/steps.png"
          />
          <info-bubble
            label="action"
            :text="`${stats.stepsPerCompletion}${
              stats.uncappedStepsPerCompletion !== stats.stepsPerCompletion
                ? `
          (${stats.uncappedStepsPerCompletion})`
                : ''
            } / ${recipe.workRequired || 1000}`"
            :tooltip="`${stats.stepsPerCompletion} steps per action`"
            iconPath="assets/icons/text/general_icons/steps.png"
          />
          <info-bubble
            label="Work Efficiency"
            :text="`${n(stats.uncappedWorkEfficiency * 100)} / ${Math.round(
              stats.maxWorkEfficiency * 100,
            )}%`"
            :tooltip="`Your Work Efficiency: ${Math.round(
              stats.uncappedWorkEfficiency * 100,
            )}%\nMax Work Efficiency: ${n(
              stats.maxWorkEfficiency * 100,
              0,
            )}%\nMax benefit at: ${
              Math.ceil(stats.effectiveMaxWorkEfficiency * 400) / 4
            }%`"
            iconPath="assets/icons/text/stats/skilling/work_efficiency.png"
            :borderClass="
              n(stats.uncappedWorkEfficiency) >=
              n(stats.effectiveMaxWorkEfficiency)
                ? 'border-green'
                : ''
            "
          />
          <skill-bubble
            label="Level"
            :skill="levelRequirement.skill"
            :text="`${levelRequirement.level}`"
            :tooltip-text="`Requires ${levelRequirement.level} ${levelRequirement.skill}`"
          />
          <template v-if="xpRewardItems.length <= 1">
            <skill-bubble
              v-for="item in xpRewardItems"
              :key="`xp-${item.skill}`"
              label="XP"
              :skill="item.skill"
              :text="item.text"
              :tooltip-text="item.tooltipText"
            />
            <skill-bubble
              v-for="item in xpPerStepItems"
              :key="`xpstep-${item.skill}`"
              label="XP / Step"
              :skill="item.skill"
              :text="item.text"
              :tooltip-text="item.tooltipText"
            />
          </template>
          <info-bubble
            label="Crafts / Mat"
            :text="`${n(stats.craftsPerMaterial)}`"
            :tooltip="`${n(stats.craftsPerMaterial)} crafts / material`"
            iconPath="assets/icons/text/stats/skilling/double_result.png"
          />
        </div>
      </div>
      <template v-if="xpRewardItems.length > 1">
        <div class="info-section">
          <ws-label label="XP rewards (current / base)" />
          <div class="info-row">
            <skill-bubble
              v-for="item in xpRewardItems"
              :key="`xp-${item.skill}`"
              :skill="item.skill"
              :text="item.text"
              :tooltip-text="item.tooltipText"
            />
          </div>
        </div>
        <div class="info-section">
          <ws-label label="XP per step (real / displayed)" />
          <div class="info-row">
            <skill-bubble
              v-for="item in xpPerStepItems"
              :key="`xpstep-${item.skill}`"
              :skill="item.skill"
              :text="item.text"
              :tooltip-text="item.tooltipText"
            />
          </div>
        </div>
      </template>
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
      <div v-if="resultHasCO" class="info-section">
        <quality-outcome-table
          :fine-mode="fineMode"
          :level-requirement="levelRequirement"
          :quality-outcome="stats.qualityOutcome"
          :crafts-per-material="stats.craftsPerMaterial"
        />
      </div>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.recipe-info {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;
}

.info-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $sm;
  align-items: flex-start;

  .info-row,
  .material-group {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
