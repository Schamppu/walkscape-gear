<script setup>
import { getDataIdMapping } from "@/utils/stringTokenizer";

const props = defineProps({ variable: String, data: [Array, Object] });

const idMap = getDataIdMapping(props.data);
</script>

<template>
  <span>
    {{ idMap[props.variable] }}
  </span>
</template>
