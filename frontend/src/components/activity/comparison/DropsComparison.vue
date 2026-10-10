<script setup lang="ts">
import { computed } from "vue";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import { useLootTables, type LootTablesContext } from "@/composables/useLootTables";
import { useChestLootTables } from "@/composables/useChestLootTables";
import { useAbilityLootTables } from "@/composables/useAbilityLootTables";
import { snakeToTitle } from "@/utils/string";
import AggregateDrops from "../drops/aggregate/AggregateDrops.vue";
import DropStepColumn from "./table/DropStepColumn.vue";
import { compareDrops, type DropStepValues } from "@/domain/comparison/dropsComparison";
import type { BaseContext } from "@/composables/context/useBaseContext";
import { icons } from "@/constants/iconPaths";

const props = defineProps<{
  gs1Ctx: BaseContext;
  gs2Ctx: BaseContext;
}>();

const { dropItemInfoMap: drops1 } = useLootTables(props.gs1Ctx as unknown as LootTablesContext);
const { dropItemInfoMap: drops2 } = useLootTables(props.gs2Ctx as unknown as LootTablesContext);
const chests1 = useChestLootTables(drops1);
const chests2 = useChestLootTables(drops2);
const abilities1 = useAbilityLootTables(props.gs1Ctx);
const abilities2 = useAbilityLootTables(props.gs2Ctx);

const toData = (v: DropStepValues | null) =>
  v ? { item: v.stepsPerItem, normal: v.stepsPerNormal, fine: v.stepsPerFine, rare: v.stepsPerRare } : {};

const dropsMap = computed(() =>
  compareDrops(drops1.value, drops2.value).map(
    ({ id, icon, comp, normalComp, fineComp, rareComp, g1, g2 }) => ({
      item: { name: snakeToTitle(id), icon, comp, normalComp, fineComp, rareComp },
      g1: toData(g1),
      g2: toData(g2),
    }),
  ),
);
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
      <td>
        <aggregate-drops
          :context="props.gs1Ctx"
          :compact="true"
          :chest-loot-tables="chests1"
          :ability-loot-tables="abilities1"
        />
      </td>
      <td>
        <aggregate-drops
          :context="props.gs2Ctx"
          :compact="true"
          :chest-loot-tables="chests2"
          :ability-loot-tables="abilities2"
        />
      </td>
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
