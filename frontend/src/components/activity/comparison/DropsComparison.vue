<script setup lang="ts">
import { computed } from "vue";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import { useLootTables, type LootTablesContext } from "@/composables/useLootTables";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import { icons } from "@/constants/iconPaths";
import { snakeToTitle } from "@/utils/string";
import AggregateDrops from "../drops/AggregateDrops.vue";
import DropStepColumn from "./table/DropStepColumn.vue";
import { partitionDropKeys } from "@/domain/comparison/dropsComparison";
import type { BaseContext } from "@/composables/context/useBaseContext";

const props = defineProps<{
  gs1Ctx: BaseContext;
  gs2Ctx: BaseContext;
}>();

const { dropItemInfoMap: drops1 } = useLootTables(props.gs1Ctx as unknown as LootTablesContext);
const { dropItemInfoMap: drops2 } = useLootTables(props.gs2Ctx as unknown as LootTablesContext);

const dropsMap = computed(() => {
  const A = drops1.value;
  const B = drops2.value;

  const { both, onlyA, onlyB } = partitionDropKeys(A, B);

  const getItemInfo = (source: Record<string, DropItemInfo>, key: string) => {
    const info = source[key];
    return {
      name: snakeToTitle(info.id),
      icon: info.icon,
      item: info.stepsPerItem,
      normal: info.stepsPerNormal,
      fine: info.stepsPerFine,
      rare: info.stepsPerRare,
    };
  };

  const bothItems = both.map((key) => {
    const item = getItemInfo(A, key);
    const item2 = getItemInfo(B, key);

    const comp = item.item - item2.item;
    const normalComp = item.normal - item2.normal;
    const fineComp = item.fine - item2.fine;
    const rareComp = item.rare - item2.rare;

    return {
      item: {
        name: item.name,
        icon: item.icon,
        comp,
        normalComp,
        fineComp,
        rareComp,
      },
      g1: item,
      g2: item2,
    };
  });

  const aItems = onlyA.map((key) => {
    const item = getItemInfo(A, key);
    return {
      item,
      g1: item,
      g2: {},
    };
  });

  const bItems = onlyB.map((key) => {
    const item = getItemInfo(B, key);
    return {
      item,
      g1: {},
      g2: item,
    };
  });

  return [...bothItems, ...aItems, ...bItems];
});
</script>

<template>
  <comparison-table-shell title="Drops Info">
    <tr>
      <td>
        <div class="item-line">
          <p>Totals /1k</p>
          <ws-icon :icon-path="icons.steps" size="sm" />
        </div>
      </td>
      <td><aggregate-drops :context="props.gs1Ctx" :compact="true" /></td>
      <td><aggregate-drops :context="props.gs2Ctx" :compact="true" /></td>
    </tr>
    <tr v-for="{ item, g1, g2 } in dropsMap" :key="item.name">
      <td>
        <div class="item-line">
          <ws-icon :icon-path="item.icon" size="md" />
          <p>{{ item.name }}</p>
        </div>
      </td>
      <drop-step-column :data="g1" :item="item" />
      <drop-step-column :data="g2" :item="item" invert />
    </tr>
  </comparison-table-shell>
</template>

<style lang="scss" scoped>
.item-line {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: $xs;

  p {
    text-align: left;
  }
}
</style>
