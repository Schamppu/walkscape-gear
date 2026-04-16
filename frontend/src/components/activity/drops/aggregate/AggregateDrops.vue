<script setup>
import { icons } from "@/constants/iconPaths";
import WsIcon from "@/components/primitives/WsIcon.vue";
import MoneyAggregateDisplay from "./MoneyAggregateDisplay.vue";
import TokenAggregateDisplay from "./TokenAggregateDisplay.vue";
import NewItemsAggregateDisplay from "./NewItemsAggregateDisplay.vue";

const props = defineProps({
  context: {
    type: Object,
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  chestLootTables: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <section :class="['aggregate-drops', { compact: props.compact }]">
    <money-aggregate-display :context="props.context" />
    <token-aggregate-display :context="props.context" />
    <p v-if="!compact" class="title">
      /1k
      <ws-icon :icon-path="icons.steps" size="sm" />
    </p>
    <new-items-aggregate-display
      v-if="!compact"
      :chest-loot-tables="props.chestLootTables"
    />
  </section>
</template>

<style lang="scss" scoped>
.title {
  display: flex;
  gap: $xxxxs;
  align-items: flex-end;
}

.aggregate-drops {
  display: flex;
  flex-wrap: wrap;
  gap: $sm;
  align-items: center;
  margin-bottom: $xxxs;

  &.compact {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
