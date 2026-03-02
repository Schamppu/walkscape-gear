<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";
import { useRouteStore } from "@/store/route";
import { useDataStore } from "@/store/data";
import { getDataIdMapping } from "@/utils/stringTokenizer";

const props = defineProps({ objectId: String, data: Array });
const { locationsMap } = useRouteStore();
const { keywordsMap } = useDataStore();

const getObjectType = (objectId) => {
  if (objectId in locationsMap) {
    return { type: "location", object: locationsMap[objectId] };
  }
  if (objectId in keywordsMap) {
    return { type: "keyword", object: keywordsMap[objectId] };
  }
  return { type: "unknown", object: {} };
};

const getColor = (type, object) => {
  if (type === "location") {
    return `color-${object.faction}`;
  }
  return "";
};

const idMap = props.data.length ? getDataIdMapping(props.data) : null;
const typeParam =
  idMap && props.objectId in idMap ? idMap[props.objectId] : props.objectId;
const { type, object } = getObjectType(typeParam);

const colorClass = getColor(type, object);
</script>

<template>
  <span :class="['object', colorClass]">
    <ws-icon :icon-path="object.icon" size="xs" />
    {{ object.name }}
  </span>
</template>
