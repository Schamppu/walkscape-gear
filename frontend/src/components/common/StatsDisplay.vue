<script setup>
import { computed } from "vue";
import { useDataStore } from "@/store/data";
import { toDeepRaw } from "@/utils/rawData";
import { resolveDisplayAttrs } from "@/domain/stats/itemStatDisplay";
import WikiButton from "@/components/common/WikiButton.vue";
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
  filterStat: {
    type: String,
    default: "",
  },
  showActiveColors: {
    type: Boolean,
    default: false,
  },
  hideWikiButton: {
    type: Boolean,
    default: false,
  },
});

const dataStore = useDataStore();

const keywords =
  !props.item.keywords || props.hideKeywords
    ? []
    : props.item.keywords
        .map((keyword) => dataStore.getKeywordById(keyword))
        .filter((k) => k?.icon);

const attrs = computed(() =>
  resolveDisplayAttrs(toDeepRaw(props.item), props.quality, props.filterStat),
);
</script>

<template>
  <div class="stats-display">
    <div class="header">
      <slot></slot>
      <wiki-button v-if="!props.hideWikiButton" :name="item.name" />
    </div>
    <div class="keywords">
      <keyword-display
        v-for="(keyword, index) in keywords"
        :key="index"
        :keyword="keyword"
      />
    </div>
    <div
      v-if="attrs.length"
      :class="[
        'stats',
        props.showQualityBorder ? `border-${props.quality}` : '',
      ]"
    >
      <stat-requirement-display
        v-for="({ stat, requirements, data }, key) in attrs"
        :key="key"
        :stat="stat"
        :data="data"
        :requirements="requirements"
        :show-active-colors="props.showActiveColors"
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

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $xs;
  margin-bottom: $xxxs;
}
</style>
