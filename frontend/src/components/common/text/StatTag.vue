<script setup>
import { useDataStore } from "@/store/data";

const props = defineProps({ stat: String, text: String });
const { statsMap } = useDataStore();


const statObj = statsMap[props.stat];
</script>

<template>
  <span>
    {{ text || statObj.name }}
  </span>
</template>
