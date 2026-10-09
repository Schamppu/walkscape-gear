<script setup>
import { computed, ref } from "vue";
import { consumableQualityOptions } from "@/domain/constants/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/primitives/WsIcon.vue";
import StatsDisplay from "../common/StatsDisplay.vue";
import { injectBaseContext } from "@/composables/context/injectShared";
import {
  consumableCounts,
  consumableEntryFields,
  toCount,
} from "@/domain/items/consumableCounts";

const props = defineProps({
  item: Object,
  selected: Boolean,
});

const emit = defineEmits(["change"]);
const [normal, fine] = consumableQualityOptions.map((q) => q.value);
const ctx = injectBaseContext();

const itemsStore = useItemsStore();
const isOpen = ref(false);

const entry = computed(() => itemsStore.ownedItems[props.item.id]);
const counts = computed(() => consumableCounts(entry.value));
const isHidden = computed(() => entry.value?.hidden ?? false);
const hideEmbargo = computed(
  () =>
    ctx.embargoedItems.value.has(props.item.id) &&
    counts.value.common + counts.value.fine === 0,
);
const hasAttrs = computed(() => props.item?.buffs?.length > 0);

/** Emits the owned-item update for these counts. Only called on user input. */
function emitChange(common, fine, hidden = isHidden.value) {
  emit("change", {
    itemId: props.item.id,
    hidden,
    ...consumableEntryFields(common, fine),
  });
}

function onCountChange(quality, event) {
  const value = toCount(event.target.value);
  event.target.value = String(value);
  const { common, fine } = counts.value;
  emitChange(quality === "common" ? value : common, quality === "fine" ? value : fine);
}

function toggleHidden(e) {
  e.stopPropagation();
  emitChange(counts.value.common, counts.value.fine, !isHidden.value);
}

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <section class="item">
    <section class="item-entry">
      <div class="group">
        <label class="count-item" @click.stop>
          Normal
          <input
            type="number"
            class="count"
            min="0"
            step="1"
            inputmode="numeric"
            :value="counts.common"
            :disabled="hideEmbargo"
            :aria-label="`${item.name}: normal owned`"
            @click.stop
            @change="onCountChange('common', $event)"
          />
        </label>
        <label class="color-fine count-item" @click.stop>
          Fine
          <input
            type="number"
            class="count"
            min="0"
            step="1"
            inputmode="numeric"
            :value="counts.fine"
            :disabled="hideEmbargo"
            :aria-label="`${item.name}: fine owned`"
            @click.stop
            @change="onCountChange('fine', $event)"
          />
        </label>
        <ws-icon
          :iconPath="hideEmbargo ? '' : item.icon"
          :outline-class="counts.fine > 0 ? 'outline-fine' : ''"
          :key="hideEmbargo ? '' : item.icon"
        />

        <div class="rows">
          <span>{{ hideEmbargo ? "Unknown" : item.name }}</span>
        </div>
      </div>

      <button
        class="toggle"
        v-if="hideEmbargo ? false : hasAttrs"
        @click="toggleOpen"
      >
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </section>

    <section v-if="hasAttrs && isOpen">
      <label class="toggle">
        <input
          type="checkbox"
          :checked="isHidden"
          aria-label="Toggle visibility"
          @click="toggleHidden"
        />
        Hide
      </label>
      <stats-display :item="props.item" :quality="normal" show-quality-border />
      <stats-display
        v-if="counts.fine > 0"
        :item="props.item"
        :quality="fine"
        show-quality-border
        hide-keywords
        hide-wiki-button
      />
    </section>
  </section>
</template>

<style lang="scss" scoped>
.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.875em;
}

.count {
  width: 3.5rem;
  text-align: center;
  background: $bgPrimary;
  color: $txPrimary;
  border: 1px solid $boxDarkOutline;
  border-radius: $xs;
  padding: $xxxxs $xxs;
  font-variant-numeric: tabular-nums;

  &:disabled {
    opacity: 0.5;
  }
}

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

.attrs {
  border-radius: $sm;
}
</style>
