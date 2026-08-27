<script setup lang="ts">
import { computed } from "vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { useFactionInfo } from "@/composables/useFactionInfo";
import type { Realm } from "@/domain/types";

const props = defineProps<{ realm: Realm }>();

const emit = defineEmits<{
  (e: "input", value: number): void;
}>();

const { getRealmLocations, setRealmLocations, getFactionColor } =
  useFactionInfo();

/** Every location the realm contains — the most a player can have discovered. */
const maxLocations = computed<number>(() => props.realm.locationCount);

const isMaxed = computed<boolean>(
  () => getRealmLocations(props.realm.id) >= maxLocations.value,
);

const toggleLabel = computed<string>(() =>
  isMaxed.value
    ? `Clear discovered locations in ${props.realm.name}`
    : `Mark every location in ${props.realm.name} as discovered`,
);

/** Jump straight to all locations discovered, or back to none when already there. */
const toggleAll = (): void => {
  const value = isMaxed.value ? 0 : maxLocations.value;
  setRealmLocations(props.realm.id, value);
  emit("input", value);
};
</script>

<template>
  <icon-input-bubble
    :id="realm.id"
    :title="`${realm.name} locations: ${getRealmLocations(realm.id)} / ${maxLocations}`"
    :icon="realm.icon"
    :min="0"
    :max="maxLocations"
    :default-value="0"
    :get-value="getRealmLocations"
    :set-value="setRealmLocations"
    :border-color="getFactionColor(realm.id) ?? undefined"
    @input="(value) => emit('input', value)"
  >
    <template #trailing>
      <button
        class="chevron-button"
        type="button"
        :title="toggleLabel"
        :aria-label="toggleLabel"
        @click="toggleAll"
      >
        {{ isMaxed ? "▼" : "▲" }}
      </button>
    </template>
  </icon-input-bubble>
</template>

<style lang="scss" scoped>
.chevron-button {
  display: flex;
  align-items: center;
  padding: 0 $xxs;
  border: none;
  border-radius: $xxs;
  color: $txLighter;
  background-color: inherit;
  font: inherit;
  font-size: $sm;
  line-height: 1;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
