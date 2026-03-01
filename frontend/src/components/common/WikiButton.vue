<script setup lang="ts">
import { computed, toRef } from "vue";
import WsButton from "@/components/primitives/WsButton.vue";
import { useWikiLink } from "@/composables/useWikiLink";

const WIKI_BUTTON_TEXT = "Wiki";
const WIKI_TITLE_SUFFIX = "(opens in a new tab)";

const props = defineProps<{
  name: string;
}>();

const { openWiki } = useWikiLink(toRef(props, "name"));
const buttonTitle = computed<string>(() => `${WIKI_BUTTON_TEXT}: ${props.name} ${WIKI_TITLE_SUFFIX}`);
const ariaLabel = computed<string>(() => buttonTitle.value);
</script>

<template>
  <ws-button
    :text="WIKI_BUTTON_TEXT"
    :aria-label="ariaLabel"
    :title="buttonTitle"
    @click="openWiki"
  />
</template>
