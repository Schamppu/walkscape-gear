<script setup>
import TabContentWrapper from "../common/TabContentWrapper.vue";
import GearSlot from "./GearSlot.vue";
</script>

<template>
  <tab-content-wrapper>
    <div class="tab-content">
      <div class="items">
        <div class="column left">
          <gear-slot slotName="cape" />
          <gear-slot slotName="hands" />
          <gear-slot slotName="primary" class="primary" />
          <gear-slot slotName="ring" index="1" />
        </div>
        <div class="column middle">
          <gear-slot slotName="head" />
          <gear-slot slotName="chest" />
          <gear-slot slotName="legs" />
          <gear-slot slotName="feet" />
        </div>
        <div class="column">
          <gear-slot slotName="back" />
          <gear-slot slotName="neck" />
          <gear-slot slotName="secondary" class="secondary" />
          <gear-slot slotName="ring" index="2" />
        </div>
      </div>
      <div class="tools">
        <div v-for="index in 6" :key="index" class="tool-wrapper">
          <gear-slot slot-name="tool" :index="`${index}`" />
        </div>
      </div>
      <div class="row">
        <gear-slot slot-name="potion" />
        <gear-slot slot-name="consumable" />
        <gear-slot slot-name="service" />
      </div>
    </div>
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.tab-content {
  flex-grow: 1;

  min-width: 25rem;
  overflow-y: auto;

  justify-content: center;
  align-items: center;

  display: flex;
  flex-direction: column;
  gap: variables.$xlg;
}

.items {
  display: flex;

  gap: variables.$xxxlg;

  .left {
    align-items: flex-end;
  }

  .middle {
    margin-top: variables.$xxxlg;
  }

  .primary {
    margin-right: variables.$xxxlg;
  }

  .secondary {
    margin-left: variables.$xxxlg;
  }
}

.tools {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: variables.$lg;
  flex-wrap: wrap;

  .tool-wrapper {
    flex: 1 1 30%;
    max-width: 30%;

    display: flex;
    justify-content: center;
  }
}

.column {
  display: flex;
  flex-direction: column;
  gap: variables.$xlg;
}

.row {
  display: flex;
  gap: variables.$xxxlg;
}
</style>