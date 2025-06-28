<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { consumableQualityOptions } from "@/utils/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";
import AttributeDisplay from "@/components/hub/AttributeDisplay.vue";

const props = defineProps({
  item: Object,
  selected: Boolean,
});

const emit = defineEmits(["change"]);
const [normal, fine] = consumableQualityOptions.map((q) => q.value);

const itemsStore = useItemsStore();
const normalOwned = ref(false);
const fineOwned = ref(false);
const isOpen = ref(false);

onMounted(() => {
  const entry = itemsStore.ownedItems[props.item.id];
  normalOwned.value = !!(
    entry &&
    (entry.quality === normal || entry.quality2 === normal)
  );
  fineOwned.value = !!(
    entry &&
    (entry.quality === fine || entry.quality2 === fine)
  );
});

watch([normalOwned, fineOwned], () => {
  // Compose the correct payload for the store
  let owned = normalOwned.value || fineOwned.value;
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
    quality,
    quality2,
  });
});

const hasAttrs = computed(() => props.item.buffs.length > 0);

function toggleNormal(e) {
  e.stopPropagation();
  normalOwned.value = !normalOwned.value;
}
function toggleFine(e) {
  e.stopPropagation();
  fineOwned.value = !fineOwned.value;
}
</script>

<template>
  <section class="item">
    <section class="item-entry">
      <div class="group">
        <div class="checkbox-item" @click="toggleNormal">
          <label for="normal-checkbox">Normal</label>
          <input
            id="normal-checkbox"
            type="checkbox"
            :checked="normalOwned"
            readonly
          />
        </div>
        <div class="checkbox-item" @click="toggleFine">
          <label for="fine-checkbox" class="color-fine">Fine</label>
          <input
            id="fine-checkbox"
            type="checkbox"
            :checked="fineOwned"
            readonly
          />
        </div>
        <ws-icon
          :iconPath="item.icon"
          :outline-class="fineOwned ? 'outline-fine' : ''"
        />

        <div class="rows">
          <span :class="`color-${quality}`">{{ item.name }}</span>
        </div>
      </div>

      <button class="toggle" v-if="hasAttrs" @click="toggleOpen">
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </section>

    <!-- <section v-if="hasAttrs && isOpen">
      <attribute-display
        :itemAttrs="item.itemAttrs"
        :qualityAttrs="item.itemQualityAttrs"
        :quality="quality"
        :key="`attributes-q1-${quality}`"
      />
      <attribute-display
        v-if="qualities === 2 && quality2 && quality !== quality2"
        :itemAttrs="item.itemAttrs"
        :qualityAttrs="item.itemQualityAttrs"
        :quality="quality2"
        :key="`attributes-q2-${quality2}`"
      />
    </section> -->
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

  .toggle {
    cursor: pointer;
    padding: 0 $xs;
    color: $txPrimary !important;
    background: none;
    border: none;
    font: inherit;
  }
}
</style>
