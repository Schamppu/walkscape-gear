<script setup>
import { computed } from "vue";
import DropItemDisplay from "./DropItemDisplay.vue";
import WsLabel from "@/components/common/WsLabel.vue";
import { mapTableToItems } from "@/utils/lootTables";

const props = defineProps({
  lootTable: Object,
});

const lootTableLabels = computed(() => {
  const { rollAmount, tables, type, tableSource } = props.lootTable;
  const labels = [];
  if (type.includes("chestTable")) {
    labels.push("Chests");
  } else if (type.includes("collectible")) {
    labels.push("Collectibles");
  } else if (!tableSource.startsWith("activity")) {
    labels.push(tableSource);
  } else {
    labels.push.apply(
      labels,
      tables.map(({ name }) => name)
    );
  }

  if (rollAmount > 1) {
    labels.push(`Roll${labels.length > 1 ? "" : "s"} ${rollAmount} times`);
  }
  return labels;
});

const tableItems = computed(() =>
  mapTableToItems(props.lootTable).map((item) => item?.rowItemID || "gold")
);
</script>

<template>
  <section v-if="lootTable.rollAmount > 0" class="loot-table-display">
    <div class="labels">
      <ws-label
        v-for="(label, index) in lootTableLabels"
        :key="`label-${index}`"
        :label="label"
        class="label"
      />
    </div>
    <div class="loot-table">
      <drop-item-display
        v-for="item in tableItems"
        :key="item"
        :item-id="item"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.loot-table-display {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  padding-top: $sm;
  gap: $sm;
  border: 1px solid $chipOutline;
  border-radius: $sm;

  .labels {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $xxxs $xxxlg;
    flex-wrap: wrap;

    .label {
      background-color: $bgPrimary;
      padding: 0;
    }
  }

  .loot-table {
    position: relative;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: $sm;
  }
}
</style>
