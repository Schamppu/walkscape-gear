<script setup>
import { ref } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import StatRequirementDisplay from "./StatRequirementDisplay.vue";
import KeywordDisplay from "@/components/common/KeywordDisplay.vue";
import { useDataStore } from "@/store/data";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  hideKeywords: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click"]);
const dataStore = useDataStore();

const attrs = sumAttrs(
  toDeepRaw(props.item.itemAttrs),
  toDeepRaw(props.item.itemQualityAttrs),
  toDeepRaw(props.item.buffs),
  props.item.quality
).flatMap(({ stats, requirements }) => {
  return stats.flatMap((stat) => {
    return { stat, requirements };
  });
});

const isOpen = ref(false);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const keywords = props.hideKeywords
  ? []
  : props.item.keywords
      .map((keyword) => dataStore.getKeywordById(keyword))
      .filter((k) => k.icon);
</script>

<template>
  <div class="display-wrapper">
    <div class="item-wrapper">
      <button class="item" @click="() => emit('click')">
        <ws-icon
          :iconPath="item.icon"
          :outline-class="`outline-${item.quality}`"
        />
        <span :class="`color-${item.quality}`">
          {{ item.name }}
        </span>
      </button>
      <button class="chevron-button" @click="toggle">
        <span>{{ isOpen ? "▲" : "▼" }}</span>
      </button>
    </div>
    <div v-if="isOpen" class="stats-display">
      <div class="keywords">
        <keyword-display
          v-for="(keyword, index) in keywords"
          :key="index"
          :keyword="keyword"
        />
      </div>
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
.display-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: $boxDarkBackground;

  border-radius: $sm;
  border: 1px solid $bgPrimary;
}

.item-wrapper {
  width: 100%;
  display: flex;
  background-color: inherit;

  border-radius: $sm;
  border: 1px solid $bgPrimary;

  .item {
    display: flex;
    gap: $xxs;
    flex-grow: 1;
    background-color: inherit;

    justify-content: center;
    align-items: center;

    padding: $xxxs $xxs;
    cursor: pointer;

    &:hover,
    &:focus {
      background-color: $boxTransparentDarkOutline;
    }
  }

  .chevron-button {
    justify-self: flex-end;
    display: inline-block;
    padding: 0 $lg;

    background-color: inherit;

    &:hover,
    &:focus {
      background-color: $boxTransparentDarkOutline;
    }
  }
}

.stats-display {
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  background-color: $bgPrimary;
}

.keywords {
  display: flex;
  justify-content: center;
  gap: $xxs;
  flex-wrap: wrap;
}
</style>
