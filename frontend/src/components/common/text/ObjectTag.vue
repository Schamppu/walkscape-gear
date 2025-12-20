<script setup>
import WsIcon from "../WsIcon.vue";
import { useRouteStore } from "@/store/route";
import { getDataIdMapping } from "@/utils/stringTokenizer";

const props = defineProps({ objectId: String, data: Array });
const { locationsMap } = useRouteStore();

const getObjectType = (objectId) => {
  if (objectId in locationsMap) {
    return { type: "location", object: locationsMap[objectId] };
  }
};

const getColor = (type, object) => {
  if (type === "location") {
    return `color-${object.faction}`;
  }
};

const idMap = getDataIdMapping(props.data);
const { type, object } = getObjectType(idMap[props.objectId]);
</script>

<template>
  <span :class="['object', getColor(type, object)]">
    <ws-icon :icon-path="object.icon" size="xs" />
    {{ object.name }}
  </span>
</template>
