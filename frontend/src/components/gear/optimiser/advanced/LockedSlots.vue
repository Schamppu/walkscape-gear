<script setup lang="ts">
import { computed } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import WsIcon from "@/components/primitives/WsIcon.vue";
import { useGearStore, type EquippedItem } from "@/store/gear";
import { getPetIcon } from "@/domain/pets/getPetIcon";
import type { GearSlot } from "@/domain/constants/gear";
import type { PetItem } from "@/domain/types/item";
import { icons } from "@/constants/iconPaths";

const props = defineProps<{ slots: GearSlot[] }>();

const gearStore = useGearStore();

const slotLabel = (slot: string): string => slot.replace(/([a-zA-Z])(\d+)/, "$1 $2");

const itemIcon = (item: EquippedItem): string =>
  "egg" in item
    ? getPetIcon(item as unknown as PetItem, item.quality, item.quality2 === "rare")
    : item.icon;

const rows = computed(() =>
  props.slots.map((slot) => ({ slot, item: gearStore.selectedGearset[slot] })),
);
</script>

<template>
  <details open class="locked-slots">
    <summary class="typography-h4">Locked slots ({{ slots.length }})</summary>

    <p v-if="!slots.length" class="hint">
      None. Lock slots from the gear slot menu to keep their items.
    </p>

    <table v-else class="locked-table">
      <tbody>
        <tr v-for="{ slot, item } in rows" :key="slot">
          <td class="slot-name">{{ slotLabel(slot) }}</td>
          <td class="slot-item">
            <div v-if="item" class="item">
              <ws-icon
                :icon-path="itemIcon(item)"
                size="xs"
                :outline-class="`outline-${item.quality}`"
              />
              <span :class="`color-${item.quality}`">{{ item.name }}</span>
            </div>
            <span v-else class="empty">Empty (kept empty)</span>
          </td>
          <td class="setting-action">
            <ws-button
              text="Unlock"
              :icon-path="icons.unlocked"
              :aria-label="`Unlock ${slotLabel(slot)}`"
              @click="gearStore.toggleSlotLock(slot)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>

<style lang="scss" scoped>
@use "@/styles/mixins/settingsTableShared" as table;

.locked-slots[open] summary {
  margin-bottom: $md;
}

.locked-table {
  @include table.settings-table($control-width: 1%);

  .slot-name {
    width: 20%;
    text-transform: capitalize;
    opacity: 0.8;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $xs;
  }

  td.setting-action {
    white-space: nowrap;
  }
}

.hint,
.empty {
  opacity: 0.7;
}
</style>
