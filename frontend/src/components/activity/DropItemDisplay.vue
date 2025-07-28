<script setup>
import { computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { useItemsStore } from "@/store/items";
import { n } from "@/utils/number";

const props = defineProps({
  sources: Array,
});

const itemsStore = useItemsStore();
const item = computed(() => props.sources?.[0] || {});

const {
  stepsPerRewardRoll,
  fineMaterialFind,
  chestFind,
  findCollectibles,
  findGems,
  findBirdNests,
} = useSkillModifiers();

const dropChanceMultipliers = (type) => {
  let multiplier = 1;
  if (type.includes("chestTable")) {
    multiplier *= chestFind.value;
  }
  if (type.includes("collectible")) {
    multiplier *= findCollectibles.value;
  }
  if (type.includes("gem")) {
    multiplier *= findGems.value;
  }
  if (type.includes("birdNest")) {
    multiplier *= findBirdNests.value;
  }

  return multiplier;
};

const sourceDropChance = (source) => {
  const { rowWeight, tableWeight, noDropChance, rollChance, type, rollAmount } =
    source;
  const odds =
    (1 - noDropChance) *
    (rollChance || 1) *
    (rowWeight / tableWeight) *
    dropChanceMultipliers(type);

  return 1 - (1 - odds) ** rollAmount;
};

const totalDropChance = computed(() => {
  const probabilityNone = props.sources
    .map(sourceDropChance)
    .reduce((acc, prob) => acc * (1 - prob), 1);
  return 100 * (1 - probabilityNone);
});

const stepsPerItem = computed(() => {
  const stepsPerSource = props.sources.map((source) => {
    const { rowMinimumAmount, rowMaximumAmount } = source;
    const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;

    return stepsPerRewardRoll.value / sourceDropChance(source) / avgAmount;
  });

  return (
    1 / stepsPerSource.map((steps) => 1 / steps).reduce((a, b) => a + b, 0)
  );
});

const itemsPerStep = computed(() => {
  const itemsPerSource = props.sources.map((source) => {
    const { rowMinimumAmount, rowMaximumAmount } = source;
    const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;

    return (sourceDropChance(source) * avgAmount) / stepsPerRewardRoll.value;
  });

  return 1000 * itemsPerSource.reduce((total, rate) => total + rate, 0);
});

const dropCounts = computed(() => {
  return props.sources
    .map((source) => {
      const { rowMinimumAmount, rowMaximumAmount } = source;
      if (rowMinimumAmount === rowMaximumAmount) {
        return `${rowMinimumAmount}`;
      }
      return `${rowMinimumAmount}-${rowMaximumAmount}`;
    })
    .join(", ");
});

const canDropFine = computed(() => {
  return (
    !item.value.isMoney && item.value.rowItemID in itemsStore.fineMaterials
  );
});

const showItemsPerStep = computed(() => item.value.isMoney);

const stepsPerFine = computed(() => {
  if (!canDropFine.value) return 0;
  return stepsPerItem.value / fineMaterialFind.value;
});
</script>

<template>
  <div
    v-if="item && (item.name || item.isMoney)"
    class="drop-item-display"
    :title="item.isMoney ? 'Gold' : item.name"
    :aria-label="item.isMoney ? 'Gold' : item.name"
  >
    <ws-icon :icon-path="item.icon" size="md" />
    <span>{{ n(totalDropChance, 3) }}%</span>
    <span>{{ dropCounts }}</span>
    <div class="step-counts">
      <div v-if="showItemsPerStep" class="steps-line">
        <span>{{ n(itemsPerStep, 0) }}</span>
        /
        <span>1k</span>
        <ws-icon
          iconPath="assets/icons/text/general_icons/steps.png"
          size="xs"
        />
      </div>
      <div v-else class="steps-line border-common">
        <ws-icon
          iconPath="assets/icons/text/general_icons/steps.png"
          size="xs"
        />
        <span>{{
          stepsPerItem < 100 ? n(stepsPerItem, 1) : n(stepsPerItem, 0)
        }}</span>
      </div>
      <div v-if="canDropFine" class="steps-line border-fine">
        <ws-icon
          iconPath="assets/icons/text/general_icons/steps.png"
          size="xs"
        />
        <span>{{ n(stepsPerFine, 0) }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.drop-item-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding-top: $xxs;
  gap: $xxxxs;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $sm;

  font-size: 0.75rem;
}

.step-counts {
  min-width: 50px;
  display: flex;
  flex-direction: column;

  .steps-line {
    display: flex;
    align-items: center;
    border-radius: $sm;
    padding: $xxxxs;
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
