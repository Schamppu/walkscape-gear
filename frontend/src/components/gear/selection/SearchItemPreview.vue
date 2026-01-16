<script setup>
import useBaseContext from "@/composables/context/useBaseContext";
import { computed } from "vue";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";
import WsLabel from "@/components/common/WsLabel.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import { icons } from "@/constants/iconPaths";

const props = defineProps({ item: Object, slotName: String });

const ctx = useBaseContext();

// Find item that was previously in this slot, and remove
const itemInSlot = ctx.gearSlots.value[props.slotName];
const { id: itemId, quality: itemQuality } = itemInSlot || {
  id: null,
  quality: null,
};
const itemIndex = ctx.equippedGear.value.findIndex(
  ({ id, quality }) => id === itemId && quality === itemQuality
);

const editedContext = {
  ...ctx,
  equippedGear: computed(() => [
    ...ctx.equippedGear.value.filter((item, index) => itemIndex !== index),
    props.item,
  ]),
};

const {
  xpPerStep: baseXpPerStep,
  stepsPerAction: baseStepsPerAction,
  workEfficiency: baseWorkEfficiency,
  stepsPerRewardRoll: baseStepsPerRewardRoll,
} = useSkillModifiers(ctx);
const {
  xpPerStep: newXpPerStep,
  stepsPerAction: newStepsPerAction,
  workEfficiency: newWorkEfficiency,
  stepsPerRewardRoll: newStepsPerRewardRoll,
} = useSkillModifiers(editedContext);

function getInfoData(prev, next, negative = false, decimals = 3) {
  return {
    text: `${n(prev.value, decimals)} → ${n(next.value, decimals)}`,
    value: negative ? prev.value - next.value : next.value - prev.value,
  };
}

const baseInfoBubbles = computed(() => {
  return [
    {
      iconPath: icons.steps,
      ...getInfoData(baseStepsPerAction, newStepsPerAction, true, 0),
    },
    {
      iconPath: icons.WE,
      ...getInfoData(baseWorkEfficiency, newWorkEfficiency, false, 2),
    },
    {
      iconPath: icons.DR,
      ...getInfoData(baseStepsPerRewardRoll, newStepsPerRewardRoll, true, 0),
    },
  ].filter(({ value }) => value !== 0);
});

const xpBubbles = computed(() => {
  return baseXpPerStep.value
    .map((xp, i) => ({
      skill: xp.skill,
      text: `${n(xp.displayedValue)} → ${n(
        newXpPerStep.value[i].displayedValue
      )}`,
      value: newXpPerStep.value[i].displayedValue - xp.displayedValue,
    }))
    .filter(({ value }) => value !== 0);
});
</script>

<template>
  <div class="info">
    <div v-if="baseInfoBubbles.length">
      <ws-label label="Base info" />
      <info-bubble
        v-for="{ iconPath, text, value } in baseInfoBubbles"
        :key="iconPath"
        :icon-path="iconPath"
        :text="text"
        :class="{
          negative: value < 0,
          positive: value > 0,
        }"
      />
    </div>
    <div v-if="xpBubbles.length">
      <ws-label label="XP per step" />
      <skill-bubble
        v-for="{ skill, text, value } in xpBubbles"
        :key="skill"
        :skill="skill"
        :text="text"
        :class="{
          negative: value < 0,
          positive: value > 0,
        }"
      />
    </div>
    <div v-if="!baseInfoBubbles.length && !xpBubbles.length">
      <p>No changes in base stats or xp per step</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.info {
  display: flex;
  flex-wrap: wrap;
  gap: $lg;
}
</style>
