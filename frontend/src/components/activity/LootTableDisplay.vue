<script setup>
import { computed } from "vue";
import DropItemDisplay from "./DropItemDisplay.vue";

const props = defineProps({
  lootTable: Object,
});

const tableItems = computed(() => {
  const { rollAmount, type } = props.lootTable;
  return props.lootTable?.tables?.flatMap(({ noDropChance, tableRows }) => {
    const mappedRows = tableRows.flatMap((row) => {
      return {
        ...row,
        noDropChance,
      };
    });
    const tableWeight = mappedRows.reduce((acc, row) => {
      return acc + (row.rowWeight || 0);
    }, 0);
    return { mappedRows, tableWeight, rollAmount, type };
  });
});
</script>

<template>
  <section v-if="lootTable.rollAmount > 0" class="loot-table-display">
    <div
      v-for="(
        { mappedRows, tableWeight, rollAmount, type }, index
      ) in tableItems"
      :key="index"
      class="loot-table"
    >
      <drop-item-display
        v-for="(item, itemIndex) in mappedRows"
        :key="itemIndex"
        :item="item"
        :total-weight="tableWeight"
        :roll-amount="rollAmount"
        :type="type"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.loot-table-display {
  display: flex;
  flex-wrap: wrap;
  gap: $sm;

  .loot-table {
    display: flex;
    gap: $sm;
  }
}
</style>
