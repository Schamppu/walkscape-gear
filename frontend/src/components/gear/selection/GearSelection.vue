<script setup>
import { ref, computed } from "vue";
import GearSlot from "./GearSlot.vue";
import GearModal from "./GearModal.vue";
import { injectBaseContext } from "@/composables/context/injectShared";
import { useSettingsStore } from "@/store/settings";

defineProps({
  isRecipe: {
    type: Boolean,
    default: false,
  },
});

const ctx = injectBaseContext();

const settingsStore = useSettingsStore();

// gearLayout dropdown: 0 = Original, 1 = Compact, 2 = Vertical tools.
// "vertical" inherits the compact tightening and adds a vertical tool column.
const layoutClass = computed(() => {
  const idx = settingsStore.gearSettings.gearLayout?.display ?? 0;
  return { compact: idx >= 1, vertical: idx === 2 };
});

const hasKeywordInput = computed(() => {
  const activity = ctx.activity.value;
  if (!activity || !("options" in activity) || !activity.options) return false;
  return activity.options.some(
    (opt) =>
      opt.type === "inputActivity" &&
      opt.inputs.some((input) => input.type === "keyword"),
  );
});

const showGearModal = ref(false);
const gearType = ref(null);
const slotName = ref(null);

const handleGearSlotSelect = (gear, slot) => {
  showGearModal.value = true;
  gearType.value = gear;
  slotName.value = slot;
};

const updateVisible = (visibility) => {
  showGearModal.value = visibility;
};
</script>

<template>
  <div class="tab-content" :class="layoutClass">
    <div class="equip">
      <div class="items">
        <div class="column left">
        <gear-slot gearType="cape" @select="handleGearSlotSelect" />
        <gear-slot gearType="hands" @select="handleGearSlotSelect" />
        <gear-slot
          gearType="primary"
          class="primary"
          @select="handleGearSlotSelect"
        />
        <gear-slot gearType="ring" index="1" @select="handleGearSlotSelect" />
      </div>
      <div class="column middle">
        <gear-slot gearType="head" @select="handleGearSlotSelect" />
        <gear-slot gearType="chest" @select="handleGearSlotSelect" />
        <gear-slot gearType="legs" @select="handleGearSlotSelect" />
        <gear-slot gearType="feet" @select="handleGearSlotSelect" />
      </div>
      <div class="column">
        <gear-slot gearType="back" @select="handleGearSlotSelect" />
        <gear-slot gearType="neck" @select="handleGearSlotSelect" />
        <gear-slot
          gearType="secondary"
          class="secondary"
          @select="handleGearSlotSelect"
        />
        <gear-slot gearType="ring" index="2" @select="handleGearSlotSelect" />
      </div>
    </div>
      <div class="tools">
        <div v-for="index in 6" :key="index" class="tool-wrapper">
          <gear-slot
            gearType="tool"
            :index="`${index}`"
            @select="handleGearSlotSelect"
          />
        </div>
      </div>
      <div class="row">
        <gear-slot gearType="consumable" @select="handleGearSlotSelect" />
        <gear-slot gearType="pet" @select="handleGearSlotSelect" />
        <gear-slot
          v-if="hasKeywordInput"
          gearType="activityInput"
          @select="handleGearSlotSelect"
        />
      </div>
    </div>
    <div v-if="showGearModal">
      <gear-modal
        :gear-type="gearType"
        :slot-name="slotName"
        @update:visible="updateVisible"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tab-content {
  flex-grow: 1;

  overflow-y: auto;

  justify-content: center;
  align-items: center;

  display: flex;
  flex-direction: column;
  gap: $xlg;
}

// Wraps the equipment paper-doll and the tool slots. A column by default so
// items sit above tools (matching the original layout); becomes a row in the
// "vertical tools" mode.
.equip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $xlg;
}

.items {
  display: flex;

  gap: $xxxlg;

  .left {
    align-items: flex-end;
  }

  .middle {
    margin-top: $xxxlg;
  }

  .primary {
    margin-right: $xxxlg;
  }

  .secondary {
    margin-left: $xxxlg;
  }
}

.tools {
  display: flex;
  align-items: center;
  justify-content: center;
  row-gap: $lg;
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
  gap: $xlg;
}

.row {
  display: flex;
  gap: $xxxlg;
}

// --- Compact: same paper-doll silhouette, smaller slots and tighter spacing.
// Also the base for the "vertical tools" mode below.
.tab-content.compact {
  --gear-slot-size: 60px;
  gap: $base;

  .equip {
    gap: $base;
  }

  .items {
    gap: $sm;

    .middle {
      margin-top: $base;
    }

    .primary {
      margin-right: $sm;
    }

    .secondary {
      margin-left: $sm;
    }
  }

  .column {
    gap: $sm;
  }

  .tools {
    row-gap: $sm;
  }

  .row {
    gap: $base;
  }
}

// --- Vertical tools: compact equipment with the 6 tool slots stacked in a
// single column beside the paper-doll. The consumable/pet row tucks under the
// items, to the left of the bottom-most tool slots.
.tab-content.vertical {
  .equip {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-areas:
      "items tools"
      "row   tools";
    align-items: start;
    justify-content: center;
    gap: $base;
  }

  .items {
    grid-area: items;
  }

  .tools {
    grid-area: tools;
    align-self: start;
    flex-direction: column;
    flex-wrap: nowrap;
    row-gap: $sm;

    .tool-wrapper {
      flex: 0 0 auto;
      max-width: none;
    }
  }

  .row {
    grid-area: row;
    justify-content: center;
  }
}
</style>
