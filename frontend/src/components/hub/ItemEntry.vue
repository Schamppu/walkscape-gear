<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { craftingQualityOptions, qualityOptions } from "@/domain/constants/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";
import StatsDisplay from "../common/StatsDisplay.vue";
import { injectBaseContext } from "@/composables/context/injectShared";
import AbilitiesDisplay from "../common/abilities/AbilitiesDisplay.vue";

const props = defineProps({
  item: Object,
  qualities: Number,
  selected: Boolean,
});

const emit = defineEmits(["change"]);

const ctx = injectBaseContext();
const defaultQuality = qualityOptions[0].value;
const itemsStore = useItemsStore();
const isOwned = ref(false);
const isHidden = ref(false);
const isEmbargo = ref(false);
const quality = ref("");
const quality2 = ref("");
const isOpen = ref(false);

onMounted(() => {
  const entry = itemsStore.ownedItems[props.item.id];
  const isCrafted = props.item?.type === "crafted";
  isEmbargo.value = ctx.embargoedItems.value.has(props.item.id);

  if (!entry) {
    isOwned.value = false;
    isHidden.value = false;
    quality.value = props.item?.quality ?? defaultQuality;
    quality2.value = props.qualities < 2 ? null : defaultQuality;
  } else {
    isOwned.value = entry.owned;
    isHidden.value = entry.hidden;
    quality.value = isCrafted
      ? entry.quality
      : props.item?.quality ?? defaultQuality;
    quality2.value =
      props.qualities < 2 ? null : entry.quality2 ?? defaultQuality;
  }
});

watch(
  () => props.selected,
  (val) => {
    if (val !== isOwned.value) {
      isOwned.value = val;
    }
  }
);

const colorClass = computed(() => {
  return `color-${quality.value}`;
});
const ownedBgClass = computed(() => {
  return isOwned.value && quality.value ? `bg-${quality.value}-dark` : "";
});

const hasAttrs = computed(() => {
  return props.item.itemAttrs.length > 0 || props.item.keywords.length > 0;
});

function emitChange(overrides = {}) {
  emit("change", {
    itemId: props.item.id,
    owned: isOwned.value,
    hidden: isHidden.value,
    quality: quality.value,
    quality2: quality2.value,
    ...overrides,
  });
}

const toggleHidden = (e) => {
  e.stopPropagation();
  isHidden.value = !isHidden.value;
  emitChange({ hidden: isHidden.value });
};

const updateQuality = () => {
  isOwned.value = true;
  emitChange({ owned: isOwned.value });
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const qualityInputs = computed(() => {
  const arr = [{ model: quality, label: "q1" }];
  if (props.qualities === 2) arr.push({ model: quality2, label: "q2" });
  return arr;
});

const hideEmbargo = computed(() => {
  return isEmbargo.value && !isOwned.value;
});

const toggleChecked = (e) => {
  e.stopPropagation();
  if (!hideEmbargo.value) {
    isOwned.value = !isOwned.value;
    emitChange({ owned: isOwned.value });
  }
};
</script>

<template>
  <section class="item">
    <section :class="['item-entry', colorClass, ownedBgClass]">
      <div class="group" @click="toggleChecked">
        <input
          type="checkbox"
          :checked="isOwned"
          :disabled="hideEmbargo"
          readonly
        />
        <ws-icon
          :iconPath="hideEmbargo ? '' : item.icon"
          :outline-class="`outline-${quality}`"
          :key="hideEmbargo ? '' : item.icon"
        />

        <div class="rows">
          <span :class="`color-${quality}`">{{
            hideEmbargo ? "Unknown" : item.name
          }}</span>
          <div v-if="hideEmbargo ? false : qualities > 0" class="group">
            <template v-for="qInput in qualityInputs" :key="qInput.label">
              <select
                v-model="qInput.model.value"
                class="quality-input"
                @click.stop
                @change="updateQuality"
              >
                <option
                  v-for="q in craftingQualityOptions"
                  :key="qInput.label + '-' + q.value"
                  :value="q.value"
                  :class="`color-${q.value}`"
                >
                  {{ q.name }}
                </option>
              </select>
            </template>
          </div>
        </div>
      </div>

      <button
        v-if="hideEmbargo ? false : hasAttrs"
        class="toggle"
        @click="toggleOpen"
      >
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </section>

    <section v-if="hasAttrs && isOpen">
      <stats-display
        v-if="isOpen"
        :item="props.item"
        :quality="quality"
        show-quality-border
      >
        <template #default>
          <label class="toggle">
            <input
              @click="toggleHidden"
              type="checkbox"
              v-model="isHidden"
              aria-label="Toggle visibility"
            />
            Hide
          </label>
        </template>
      </stats-display>
      <stats-display
        v-if="qualities > 1 && quality2 && quality !== quality2"
        :item="props.item"
        :quality="quality2"
        show-quality-border
        hide-keywords
      />
      <abilities-display
        v-if="props.item.abilities"
        :abilities="props.item.abilities"
      />
    </section>
  </section>
</template>

<style lang="scss" scoped>
.item-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;

  background-color: $boxDarkBackground;
  border-radius: $sm;
  border: 1px solid $bgPrimary;
  gap: $xxs;

  padding: $xxxs $xxs;

  .rows {
    display: flex;
    flex-direction: column;
    gap: $xxxs;
  }

  .group {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: $xxs;
    flex-grow: 1;
  }
}

.toggle {
  cursor: pointer;
  padding: 0 $xs;
  color: $txPrimary !important;
  background: none;
  border: none;
  font: inherit;
}
</style>
