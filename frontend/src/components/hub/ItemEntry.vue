<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { craftingQualityOptions, qualityOptions } from "@/utils/quality";
import { useItemsStore } from "@/store/items";
import { toDeepRaw } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";
import WsIcon from "@/components/common/WsIcon.vue";
import StatRequirementDisplay from "@/components/gear/StatRequirementDisplay.vue";

const props = defineProps({
  item: Object,
  qualities: Number,
  selected: Boolean,
});

const emit = defineEmits(["change"]);

const defaultQuality = qualityOptions[0].value;
const itemsStore = useItemsStore();
const isOwned = ref(false);
const quality = ref("");
const quality2 = ref("");
const isOpen = ref(false);

onMounted(() => {
  const entry = itemsStore.ownedItems[props.item.id];
  isOwned.value = entry?.owned ?? false;
  quality.value = entry?.quality ?? props.item?.quality ?? defaultQuality;
  quality2.value = props.qualities < 2 ? null : entry?.quality2 ?? defaultQuality;
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
  return props.item.itemAttrs.length > 0;
});

const toggleChecked = (e) => {
  e.stopPropagation();
  const data = {
    itemId: props.item.id,
    owned: !props.selected,
    quality: quality.value,
    quality2: quality2.value,
  };

  emit("change", data);
};

const updateQuality = () => {
  const data = {
    itemId: props.item.id,
    owned: true,
    quality: quality.value,
    quality2: quality2.value,
  };

  emit("change", data);
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const mapAttrs = (quality) => {
  const itemCopy = toDeepRaw(props.item);
  return sumAttrs(
    itemCopy.itemAttrs,
    itemCopy.itemQualityAttrs,
    itemCopy.buffs,
    quality
  ).flatMap(({ stats, requirements }) => {
    return stats.flatMap((stat) => {
      return { stat, requirements: requirements || [] };
    });
  });
};

const attrs = computed(() => {
  return mapAttrs(quality.value);
});

const attrs2 = computed(() => {
  return mapAttrs(quality2.value);
});
</script>

<template>
  <section class="item">
    <section :class="['item-entry', colorClass, ownedBgClass]">
      <div class="group" @click="toggleChecked">
        <input type="checkbox" :checked="isOwned" readonly />
        <ws-icon :iconPath="item.icon" :outline-class="`outline-${quality}`" />

        <div class="rows">
          <span :class="`color-${quality}`">{{ item.name }}</span>
          <div v-if="qualities > 0" class="group">
            <select
              v-model="quality"
              class="quality-input"
              @click.stop
              @change="updateQuality"
            >
              <option
                v-for="q in craftingQualityOptions"
                :key="'q1-' + q.value"
                :value="q.value"
                :class="`color-${q.value}`"
              >
                {{ q.name }}
              </option>
            </select>
            <select
              v-if="qualities === 2"
              v-model="quality2"
              class="quality-input"
              @click.stop
              @change="updateQuality"
            >
              <option
                v-for="q in craftingQualityOptions"
                :key="'q2-' + q.value"
                :value="q.value"
                :class="`color-${q.value}`"
              >
                {{ q.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <button class="toggle" v-if="hasAttrs" @click="toggleOpen">
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </section>

    <section v-if="hasAttrs && isOpen">
      <div :class="`border-${quality}`" class="attrs">
        <stat-requirement-display
          v-for="({ stat, requirements }, key) in attrs"
          :key="key"
          :stat="stat"
          :requirements="requirements"
        />
      </div>
      <div v-if="quality2 && quality !== quality2" :class="`border-${quality2}`" class="attrs">
        <stat-requirement-display
          v-for="({ stat, requirements }, key) in attrs2"
          :key="key"
          :stat="stat"
          :requirements="requirements"
        />
      </div>
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

  .toggle {
    cursor: pointer;
    padding: 0 $xs;
    color: $txPrimary !important;
    background: none;
    border: none;
    font: inherit;
  }
}

.attrs {
  border-radius: $sm;
}
</style>
