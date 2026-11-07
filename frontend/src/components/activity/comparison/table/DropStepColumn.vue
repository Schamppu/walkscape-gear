<script setup>
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import DropStepValue from "./DropStepValue.vue";

defineProps({
  data: Object,
  item: Object,
  invert: { type: Boolean, default: false },
});

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);
</script>

<template>
  <td>
    <div v-if="data.item > 0" class="step-counts">
      <drop-step-value
        class="border-common"
        :data="
          activitySettings.shownDropRate.display === 1 ? data.normal : data.item
        "
        :comp="
          activitySettings.shownDropRate.display === 1
            ? item.normalComp
            : item.comp
        "
        :invert="invert"
      />
      <drop-step-value
        class="border-fine"
        :data="data.fine"
        :comp="item.fineComp"
        :invert="invert"
      />
      <drop-step-value
        class="border-petRare"
        :data="data.rare"
        :comp="item.rareComp"
        :invert="invert"
      />
    </div>
  </td>
</template>

<style lang="scss" scoped>
.step-counts {
  min-width: 50px;
  display: flex;
  flex-direction: column;

  .steps-line {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $xxxs;

    border-radius: $sm;
    padding: $xxxxs;
    width: 100%;
    box-sizing: border-box;

    span {
      text-wrap: nowrap;
      text-align: left;
    }
  }
}
</style>
