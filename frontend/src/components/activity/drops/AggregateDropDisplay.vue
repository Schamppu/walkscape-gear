<script setup>
import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import InfoBubble from "@/components/common/InfoBubble.vue";
import useBaseContext from "@/composables/context/useBaseContext";
import { useLootTables } from "@/composables/useLootTables";
import { useRequirements } from "@/composables/useRequirements";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { useFineMaterials } from "@/composables/useFineMaterialsCalculations";
import getOutcomeOdds from "@/utils/qualityOutcomeOdds";
import { n } from "@/utils/number";
import { icons } from "@/constants/iconPaths";
import { tokenValues } from "@/constants/tokenValues";
import { useActivityStore } from "@/store/activity";

const props = defineProps({
  type: {
    type: String,
    validator: (value) => ["money", "token"].includes(value),
  },
  context: { type: Object, default: null },
});

const ctx = props.context || useBaseContext();
const { dropItemInfoMap } = useLootTables(ctx);

const dataStore = useDataStore();
const itemsStore = useItemsStore();
const { getLevelRequirementsMap } = useRequirements(ctx);
const {
  stepsPerRewardRoll,
  stepsPerAction,
  noMaterialsConsumed,
  qualityOutcome,
} = useSkillModifiers(ctx);
const { useFine } = useFineMaterials(ctx);

const materialValue = (id, itemInfo, valueSource) => {
  const { stepsPerNormal, stepsPerFine } = itemInfo;
  const normalPerStep = stepsPerNormal ? 1000 / stepsPerNormal : 0;
  if (stepsPerFine) {
    const finePerStep = 1000 / stepsPerFine;
    const { common, fine } = valueSource[id];
    return common * normalPerStep + fine * finePerStep;
  } else if (id in valueSource) {
    const { common } = valueSource[id];
    return common * normalPerStep;
  }
};

const getCraftingOdds = () => {
  const levelMap = getLevelRequirementsMap(ctx.recipe.value.requirements);
  const level = Object.values(levelMap)[0];

  const odds = getOutcomeOdds(level, qualityOutcome.value, useFine.value);
  return odds.map((item) => {
    return {
      ...item,
      odds1: 1 - (1 - item.value) ** props.crafts,
      avg: props.crafts * item.value,
    };
  });
};

const recipeValue = computed(() => {
  if (!ctx.recipeSelected.value) return 0;

  const { materials, itemRewards } = ctx.source.value;
  const rewardValues = Object.entries(itemRewards).map(([item, amount]) => {
    if (
      item in itemsStore.allGearItems &&
      itemsStore.allGearItems[item].type === "crafted"
    ) {
      const odds = getCraftingOdds();
      const values = odds.reduce(
        (total, { qualityValue, value }) =>
          total + value * dataStore.itemValues[item][qualityValue],
        0,
      );
      return values * (1000 / stepsPerRewardRoll.value);
    } else {
      const steps = stepsPerRewardRoll.value;
      const info = {
        stepsPerNormal: useFine.value ? 0 : steps,
        stepsPerFine: useFine.value ? steps : 0,
      };
      return amount * materialValue(item, info, dataStore.itemValues);
    }
  });
  const rewardValue1k = rewardValues.reduce((a, b) => a + b, 0);

  const allMaterials = materials.flatMap(({ options }) => options[0]);
  const materialCost = allMaterials.map(({ amount, item }) => {
    if (item in itemsStore.allGearItems) {
      return amount * Object.values(dataStore.itemValues[item])[0];
    } else {
      const quality = useFine.value ? "fine" : "common";
      return amount * dataStore.itemValues[item][quality];
    }
  });
  const materialsPer1k =
    1000 / (stepsPerAction.value / (1 - noMaterialsConsumed.value));
  const materialCost1k =
    materialCost.reduce((a, b) => a + b, 0) * materialsPer1k;

  return rewardValue1k - materialCost1k;
});

const goldTotal = computed(() => {
  const data = Object.entries(dropItemInfoMap.value);

  const sum = data.reduce((total, [id, info]) => {
    if (id === "gold") {
      return total + info.itemsPerStep;
    } else if (id in itemsStore.allGearItems && id in dataStore.itemValues) {
      const { quality } = itemsStore.allGearItems[id];
      const { itemsPerStep } = info;
      const prices = dataStore.itemValues[id];

      return total + itemsPerStep * prices[quality];
    } else if (id in dataStore.itemValues) {
      return total + materialValue(id, info, dataStore.itemValues);
    }
    return total;
  }, 0);

  return sum;
});

const tokenTotal = computed(() => {
  const data = Object.entries(dropItemInfoMap.value);
  const out = data
    .filter(([id]) => id in tokenValues)
    .map(([id, info]) => materialValue(id, info, tokenValues))
    .reduce((a, b) => a + b, 0);
  return out;
});

const displayValue = computed(() => {
  if (props.type === "money") return n(goldTotal.value + recipeValue.value, 2);
  if (props.type === "token") return n(tokenTotal.value, 2);
  return "";
});

const icon = computed(() => {
  if (props.type === "money") return icons.money;
  if (props.type === "token") return icons.token;
  return "";
});

const tooltip = computed(() => {
  if (props.type === "money") return `${displayValue.value} money per 1k steps`;
  if (props.type === "token")
    return `${displayValue.value} adventurer's guild tokens per 1k steps`;
  return "";
});
</script>

<template>
  <info-bubble
    v-if="displayValue !== '0'"
    :text="displayValue"
    :icon-path="icon"
    :tooltip="tooltip"
  />
</template>

<style lang="scss" scoped></style>
