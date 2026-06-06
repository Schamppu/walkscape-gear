<script setup lang="ts">
import { computed } from "vue";
import { gearSlots, slotMax } from "@/domain/constants/gear";
import type { GearSlot } from "@/domain/constants/gear";
import { SLOT_LABELS } from "@/constants/advancedOptimiser/targets";

const props = defineProps<{
  locks: Record<string, true>;
  playerLevel: number;
}>();

const emit = defineEmits<{
  "update:locks": [locks: Record<string, true>];
}>();

const activeSlots = computed((): GearSlot[] => {
  const toolbeltSize = slotMax("tool", props.playerLevel);
  return (gearSlots as readonly GearSlot[]).filter((slot) => {
    const toolMatch = slot.match(/^tool(\d+)$/);
    if (toolMatch && Number(toolMatch[1]) > toolbeltSize) return false;
    return true;
  });
});

const toggleLock = (slot: GearSlot) => {
  const next = { ...props.locks };
  if (next[slot]) {
    delete next[slot];
  } else {
    next[slot] = true;
  }
  emit("update:locks", next);
};
</script>

<template>
  <div class="slot-locks">
    <button
      v-for="slot in activeSlots"
      :key="slot"
      class="slot-btn"
      :class="{ locked: locks[slot] }"
      @click="toggleLock(slot)"
    >
      {{ SLOT_LABELS[slot] ?? slot }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.slot-locks {
  display: flex;
  flex-wrap: wrap;
  gap: $xs;
}

.slot-btn {
  padding: $xxxs $xs;
  border-radius: $sm;
  border: 1px solid $boxPrimaryOutline;
  background: transparent;
  cursor: pointer;
  color: inherit;
  font-size: 0.8rem;
  opacity: 0.6;
  transition: opacity 0.1s, background-color 0.1s, border-color 0.1s;

  &:hover {
    opacity: 0.9;
    background-color: $boxTransparentDarkOutline;
  }

  &.locked {
    opacity: 1;
    border-color: $txPositive;
    background-color: $txPositiveDark;
    color: $txPrimary;
  }
}
</style>
