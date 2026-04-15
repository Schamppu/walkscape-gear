<script setup>
import {
  getMainSkillRequirement,
  getDistinctKeywordItemsEquippedRequirement,
} from "@/domain/requirements/requirementUtils";
import { usePlayerStore } from "@/store/player";
import { useDataStore } from "@/store/data";
import WsIcon from "@/components/primitives/WsIcon.vue";

const { skillsMap, factionsMap } = usePlayerStore();
const { keywordsMap } = useDataStore();

const props = defineProps({ k: String, data: Object });

const determineValue = () => {
  if (!props.data) return props.k;
  if (props.k === "skill") {
    const skill = getMainSkillRequirement(props.data.requirements);
    const skillObj = skillsMap[skill];
    return { icon: skillObj.icon, value: skillObj.name };
  } else if (props.k === "quantity") {
    const req = getDistinctKeywordItemsEquippedRequirement(
      props.data.requirements,
    );
    return req ? { value: req.quantity } : { value: props.data.quantity };
  } else if (props.k === "keyword") {
    const kw = props.data.requirements.flatMap(
      ({ requirement }) => requirement.keywords || [requirement.keyword] || [],
    );
    if (kw.length > 0) {
      const kwObj = keywordsMap[kw[0]];
      return { icon: kwObj.icon, value: kwObj.name };
    }
  } else if (props.k === "realm") {
    const realmReq = props.data.requirements.find(
      ({ requirement }) => requirement.realm,
    );
    if (realmReq) {
      const realmObj = factionsMap[realmReq.requirement.realm];
      return { icon: realmObj.icon, value: realmObj.name };
    }
  } else {
    console.log("Unknown tag type", props.k, props.data);
  }

  return { value: props.k };
};
</script>

<template>
  <span>
    <ws-icon
      v-if="determineValue().icon"
      :icon-path="determineValue().icon"
      size="xs"
      class="icon"
    />
    {{ determineValue().value }}
  </span>
</template>

<style lang="scss" scoped>
.icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
