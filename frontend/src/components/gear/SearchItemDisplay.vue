<script setup>
import { ref, computed } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import StatsDisplay from "../common/StatsDisplay.vue";
import SearchItemPreview from "./SearchItemPreview.vue";
import { getPetIcon } from "@/utils/pets";
import { icons } from "@/constants/iconPaths";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  highlightStat: {
    type: String,
    default: "",
  },
  slotName: {
    type: String,
  },
});

const emit = defineEmits(["click"]);

const isOpen = ref(false);
const previewOpen = ref(false);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const togglePreview = () => {
  previewOpen.value = !previewOpen.value;
};

const icon = computed(() => {
  return "egg" in props.item
    ? getPetIcon(props.item, props.item.quality, props.item.quality2 === "rare")
    : props.item.icon;
});
</script>

<template>
  <div class="display-wrapper">
    <div class="item-wrapper">
      <button class="icon-button" @click="togglePreview">
        <ws-icon :icon-path="icons.show" size="xs" :extra-classes="['gray']" />
      </button>
      <button class="item" @click="() => emit('click')">
        <ws-icon :iconPath="icon" :outline-class="`outline-${item.quality}`" />
        <span :class="`color-${item.quality}`">
          {{ item.name }}
        </span>
      </button>
      <button class="chevron-button" @click="toggle">
        <span>{{ isOpen ? "▲" : "▼" }}</span>
      </button>
    </div>
    <stats-display
      v-if="isOpen"
      :item="props.item"
      :quality="props.item.quality"
      showActiveColors
    />
    <stats-display
      v-if="!isOpen && props.highlightStat !== 'none'"
      :item="props.item"
      :quality="props.item.quality"
      :filter-stat="props.highlightStat === 'none' ? '' : props.highlightStat"
      showActiveColors
      hide-keywords
    />
    <search-item-preview
      v-if="previewOpen && props.slotName"
      :item="item"
      :slot-name="props.slotName"
    />
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

  .icon-button {
    display: inline-block;
    align-items: center;
    padding: 0 $md;

    background-color: inherit;

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
</style>
