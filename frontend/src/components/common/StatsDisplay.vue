<script setup>
import { computed } from "vue";
import { useDataStore } from "@/store/data";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";
import { stripHtmlTags } from "@/utils/stripHtmlTags";
import WikiButton from "@/components/common/WikiButton.vue";
import StatRequirementDisplay from "./StatRequirementDisplay.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  quality: String,
  petLevel: { type: Number, default: null },
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
});

const dataStore = useDataStore();

const keywords = props.hideKeywords
  ? []
  : props.item.keywords
      .map((keyword) => dataStore.getKeywordById(keyword))
      .filter((k) => k?.icon);

const mapAttrs = (quality) => {
  const itemCopy = toDeepRaw(props.item);
  const usedAttrs =
    props.petLevel !== null
      ? itemCopy.levels[props.petLevel - 1].attributes
      : itemCopy.itemAttrs;

  const baseAttrs = sumAttrs(
    usedAttrs,
    itemCopy.itemQualityAttrs,
    itemCopy.buffs,
    quality
  );

  return baseAttrs
    .flatMap((obj) => {
      const { customText, stats, requirements } = obj;
      return stats.flatMap((stat) => {
        if (stat.stat === "roll_special_table") {
          stat.name = stripHtmlTags(customText);
          stat.customIcon = obj.customIcon;
        }

        return { stat, requirements: requirements || [] };
      });
    })
    .filter(({ stat }) => {
      if (props.filterStat) {
        return stat.type === props.filterStat;
      }
      return true;
    });
};

const attrs = computed(() => mapAttrs(props.quality));
</script>

<template>
  <div class="stats-display">
    <div class="header">
      <slot></slot>
      <wiki-button :name="item.name" />
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
        v-for="({ stat, requirements }, key) in attrs"
        :key="key"
        :stat="stat"
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
