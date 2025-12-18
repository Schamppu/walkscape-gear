<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { consumableQualityOptions } from "@/constants/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";
import StatsDisplay from "../common/StatsDisplay.vue";
import useBaseContext from "@/composables/useBaseContext";

const props = defineProps({
  item: Object,
  selected: Boolean,
});

const emit = defineEmits(["change"]);
const [normal, fine] = consumableQualityOptions.map((q) => q.value);
const ctx = useBaseContext();

const itemsStore = useItemsStore();
const normalOwned = ref(false);
const fineOwned = ref(false);
const isHidden = ref(false);
const isEmbargo = ref(false);
const isOpen = ref(false);

function updateOwnedFromStore() {
  const entry = itemsStore.ownedItems[props.item.id];
  isEmbargo.value = ctx.embargoedItems.value.has(props.item.id);
  normalOwned.value = !!(
    entry &&
    (entry.quality === normal || entry.quality2 === normal)
  );
  fineOwned.value = !!(
    entry &&
    (entry.quality === fine || entry.quality2 === fine)
  );
  isHidden.value = entry?.hidden ?? false;
}

onMounted(updateOwnedFromStore);

watch(
  () => itemsStore.ownedItems[props.item.id],
  () => {
    updateOwnedFromStore();
  },
  { deep: true }
);

watch([normalOwned, fineOwned, isHidden], () => {
  let owned = normalOwned.value || fineOwned.value;
  let hidden = isHidden.value;
  let quality = null;
  let quality2 = null;
  if (owned) {
    if (normalOwned.value && fineOwned.value) {
      quality = normal;
      quality2 = fine;
    } else if (normalOwned.value) {
      quality = normal;
    } else if (fineOwned.value) {
      quality = fine;
    }
  }
  emit("change", {
    itemId: props.item.id,
    owned,
    hidden,
    quality,
    quality2,
  });
});

const hasAttrs = computed(() => props.item.buffs.length > 0);

function toggleNormal(e) {
  e.stopPropagation();
  if (hideEmbargo.value) normalOwned.value = !normalOwned.value;
}
function toggleFine(e) {
  e.stopPropagation();
  if (hideEmbargo.value) fineOwned.value = !fineOwned.value;
}
function toggleHidden(e) {
  e.stopPropagation();
  isHidden.value = !isHidden.value;
}
const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};
const hideEmbargo = computed(() => {
  return isEmbargo.value && !(normalOwned.value || fineOwned.value);
});
</script>

<template>
  <section class="item">
    <section class="item-entry">
      <div class="group">
        <div>
          <label class="checkbox-item"
            >Normal
            <input
              type="checkbox"
              v-model="normalOwned"
              :disabled="hideEmbargo"
              @click="toggleNormal"
            />
          </label>
        </div>
        <div>
          <label class="color-fine checkbox-item"
            >Fine
            <input
              type="checkbox"
              v-model="fineOwned"
              :disabled="hideEmbargo"
              @click="toggleFine"
          /></label>
        </div>
        <ws-icon
          :iconPath="hideEmbargo ? '' : item.icon"
          :outline-class="fineOwned ? 'outline-fine' : ''"
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
          @click="toggleHidden"
          type="checkbox"
          v-model="isHidden"
          aria-label="Toggle visibility"
        />
        Hide
      </label>
      <stats-display :item="props.item" :quality="normal" show-quality-border />
      <stats-display
        v-if="fineOwned"
        :item="props.item"
        :quality="fine"
        show-quality-border
        hide-keywords
      />
    </section>
  </section>
</template>

<style lang="scss" scoped>
.checkbox-item {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.attrs {
  border-radius: $sm;
}
</style>
