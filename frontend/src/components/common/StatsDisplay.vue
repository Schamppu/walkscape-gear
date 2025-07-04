<script setup>
import { useDataStore } from "@/store/data";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";
import StatRequirementDisplay from "./StatRequirementDisplay.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  quality: String,
  showQualityBorder: {
    type: Boolean,
    default: false,
  },
  hideKeywords: {
    type: Boolean,
    default: false,
  },
});

const dataStore = useDataStore();

const keywords = props.hideKeywords
  ? []
  : props.item.keywords
      .map((keyword) => dataStore.getKeywordById(keyword))
      .filter((k) => k.icon);

const mapAttrs = (quality) => {
  const itemCopy = toDeepRaw(props.item);
  return sumAttrs(
    itemCopy.itemAttrs,
    itemCopy.itemQualityAttrs,
    itemCopy.buffs,
    quality
  ).flatMap(({ stats, requirements }) => {
    return stats.flatMap((stat) => {
      return { stat, requirements: requirements || [] };
    });
  });
};

const attrs = mapAttrs(props.quality);
</script>

<template>
  <div class="stats-display">
    <div class="keywords">
      <keyword-display
        v-for="(keyword, index) in keywords"
        :key="index"
        :keyword="keyword"
      />
    </div>
    <div
      :class="[
        'stats',
        props.showQualityBorder ? `border-${props.quality}` : '',
      ]"
    >
      <stat-requirement-display
        v-for="({ stat, requirements }, key) in attrs"
        :key="key"
        :stat="stat"
        :requirements="requirements"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stats-display {
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  background-color: $bgPrimary;

  .keywords {
    display: flex;
    justify-content: center;
    gap: $xxs;
    flex-wrap: wrap;
  }

  .stats {
    border-radius: $sm;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
}
</style>
