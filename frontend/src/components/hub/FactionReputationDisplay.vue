<script setup lang="ts">
import { computed } from "vue";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import { useFactionInfo } from "@/composables/useFactionInfo";
import type { Faction } from "@/domain/types";

const props = defineProps<{ faction: Faction }>();

const emit = defineEmits<{
  (e: "input", value: number): void;
}>();

const { getReputation, setReputation, getFactionColor } = useFactionInfo();

/** Factions rendered here always have a reputation track; fall back for safety. */
const reputationKey = computed<string>(() => props.faction.reputation ?? "");
</script>

<template>
  <icon-input-bubble
    :id="reputationKey"
    :title="`${faction.name} reputation: ${getReputation(reputationKey)}`"
    :icon="faction.icon"
    :min="0"
    :max="9999"
    :default-value="0"
    :get-value="getReputation"
    :set-value="setReputation"
    :border-color="getFactionColor(faction.id) ?? undefined"
    @input="(value) => emit('input', value)"
  />
</template>
