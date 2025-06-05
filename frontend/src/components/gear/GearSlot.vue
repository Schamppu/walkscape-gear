<script setup>
import { computed } from "vue";
import { useGearStore } from "@/store/gear";
import { storeToRefs } from "pinia";
import WsIcon from "@/components/common/WsIcon.vue";

const emit = defineEmits(["select"]);

const props = defineProps({
  gearType: {
    type: String,
    required: true,
  },
  index: {
    type: String,
  },
});

const gearStore = useGearStore();
const storeRefs = storeToRefs(gearStore);
const getDynamicRef = (key) => computed(() => storeRefs[key]);

const storeKey = props.index
  ? `${props.gearType}${props.index}`
  : props.gearType;
const gearRef = getDynamicRef(storeKey);

const handleClick = () => emit("select", props.gearType, storeKey);
</script>

<template>
  <div class="gear-slot-wrapper" @click="handleClick">
    <p v-if="!gearRef.value" class="typography-label label">{{ gearType }}</p>
    <div v-else class="content">
      <ws-icon :icon-path="gearRef.value.icon" size="xl" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gear-slot-wrapper {
  width: 80px;
  height: 80px;
  border: 1px solid $boxPrimaryOutline;
  border-radius: $md;

  cursor: pointer;
  overflow: hidden;
}

.content {
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
}

.label {
  margin-top: $md;
  text-align: center;
}
</style>
