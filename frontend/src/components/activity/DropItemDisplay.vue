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

const groupSourcesByStat = (sources) => {
  return sources.reduce((groups, source) => {
    const statKey = source.stat || "default";
    if (!groups[statKey]) {
      groups[statKey] = [];
    }
    groups[statKey].push(source);
    return groups;
  }, {});
};

const getCombinedRollChance = (sourcesInGroup) => {
  return sourcesInGroup.reduce((sum, source) => {
    return sum + (source.rollChance || 1);
  }, 0);
};

const sourceDropChance = (source, combinedRollChance = null) => {
  const { rowWeight, tableWeight, noDropChance, rollChance, type, rollAmount } =
    source;
  const effectiveRollChance = Math.min(
    1,
    combinedRollChance ?? (rollChance || 1)
  );
  const odds =
    (1 - noDropChance) *
    effectiveRollChance *
    (rowWeight / tableWeight) *
    dropChanceMultipliers(type);

  return 1 - (1 - odds) ** rollAmount;
};

const totalDropChance = computed(() => {
  const groupedSources = groupSourcesByStat(props.sources);

  // Calculate probability for each stat group
  const statGroupProbabilities = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      if (sourcesInGroup.length === 1) {
        // Single source, use normal calculation
        return sourceDropChance(sourcesInGroup[0]);
      } else {
        // Multiple sources with same stat, sum their rollChance values
        const combinedRollChance = getCombinedRollChance(sourcesInGroup);

        // Use the first source as template but with combined rollChance
        return sourceDropChance(sourcesInGroup[0], combinedRollChance);
      }
    }
  );

  // Calculate overall probability (1 - probability that none of the stat groups proc)
  const probabilityNone = statGroupProbabilities.reduce(
    (acc, prob) => acc * (1 - prob),
    1
  );
  return 100 * (1 - probabilityNone);
});

const stepsPerItem = computed(() => {
  const groupedSources = groupSourcesByStat(props.sources);

  // Calculate steps per source for each stat group
  const stepsPerStatGroup = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      if (sourcesInGroup.length === 1) {
        // Single source, use normal calculation
        const source = sourcesInGroup[0];
        const { rowMinimumAmount, rowMaximumAmount } = source;
        const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;
        return stepsPerRewardRoll.value / sourceDropChance(source) / avgAmount;
      } else {
        // Multiple sources with same stat, sum their rollChance values
        const combinedRollChance = getCombinedRollChance(sourcesInGroup);

        // Use the first source as template but with combined rollChance
        const templateSource = sourcesInGroup[0];
        const { rowMinimumAmount, rowMaximumAmount } = templateSource;
        const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;

        return (
          stepsPerRewardRoll.value /
          sourceDropChance(templateSource, combinedRollChance) /
          avgAmount
        );
      }
    }
  );

  return (
    1 / stepsPerStatGroup.map((steps) => 1 / steps).reduce((a, b) => a + b, 0)
  );
});

const itemsPerStep = computed(() => {
  const groupedSources = groupSourcesByStat(props.sources);

  // Calculate items per step for each stat group
  const itemsPerStatGroup = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      if (sourcesInGroup.length === 1) {
        // Single source, use normal calculation
        const source = sourcesInGroup[0];
        const { rowMinimumAmount, rowMaximumAmount } = source;
        const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;
        return (
          (sourceDropChance(source) * avgAmount) / stepsPerRewardRoll.value
        );
      } else {
        // Multiple sources with same stat, sum their rollChance values
        const combinedRollChance = sourcesInGroup.reduce((sum, source) => {
          return sum + (source.rollChance || 1);
        }, 0);

        // Use the first source as template but with combined rollChance
        const templateSource = sourcesInGroup[0];
        const { rowMinimumAmount, rowMaximumAmount } = templateSource;
        const avgAmount = (rowMaximumAmount + rowMinimumAmount) / 2;

        return (
          (sourceDropChance(templateSource, combinedRollChance) * avgAmount) /
          stepsPerRewardRoll.value
        );
      }
    }
  );

  return 1000 * itemsPerStatGroup.reduce((total, rate) => total + rate, 0);
});

const dropCounts = computed(() => {
  const groupedSources = groupSourcesByStat(props.sources);

  // Calculate counts for each stat group
  const statGroupCounts = Object.values(groupedSources).map(
    (sourcesInGroup) => {
      // For sources with the same stat, they should have the same drop amounts
      // (just with higher chance due to combined rollChance)
      // So we just show the drop count from the first source in the group
      const { rowMinimumAmount, rowMaximumAmount } = sourcesInGroup[0];
      if (rowMinimumAmount === rowMaximumAmount) {
        return `${rowMinimumAmount}`;
      }
      return `${rowMinimumAmount}-${rowMaximumAmount}`;
    }
  );

  return statGroupCounts.join(", ");
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
