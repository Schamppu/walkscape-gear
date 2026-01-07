<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/useBaseContext";
import { useRequirements } from "@/composables/useRequirements";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { consumableQualityOptions } from "@/constants/quality";
import { itemQualityNameSort } from "@/utils/sorting";
import { usedAttrs } from "@/utils/qualityAttrs";
import { intersect } from "@/utils/intersect";
import WsIcon from "@/components/common/WsIcon.vue";
import SearchItemDisplay from "./SearchItemDisplay.vue";

const props = defineProps({
  gearType: {
    type: String,
    required: true,
  },
  slotName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["selectItem", "close"]);

const dataStore = useDataStore();
const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);

const ctx = useBaseContext();
const { checkRequirements } = useRequirements(ctx);
const { showItemForActivity } = useShowItemForActivity(ctx);

const searchTerm = ref("");

const slotItems = Object.values(ctx.allGearItems.value).filter(
  ({ gearType, type, egg }) =>
    gearType === props.gearType ||
    type === props.gearType ||
    (props.gearType === "pet" && egg)
);

const otherSlotIds = computed(() => {
  if (props.gearType !== "tool") return [];
  return [1, 2, 3, 4, 5, 6]
    .map((i) => `tool${i}`)
    .filter((id) => id !== props.slotName)
    .map((slot) => ctx.gearSlots.value[slot]?.id || null);
});

const filteredItems = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const showOwned = gearSettings.value.showOwned.value;
  const showUseful = gearSettings.value.showUseful.value;

  const filterActivity = (item) => {
    if (!ctx.source.value || !showUseful) {
      return true;
    }

    return showUseful && ctx.source.value && showItemForActivity(item);
  };
  const filterSearch = ({ name }) =>
    (term && name.toLowerCase().includes(term)) || !term;
  const filterOwned = (item) =>
    (showOwned && item.id in ctx.ownedItems.value) || !showOwned;
  const filterEquipped = (item) =>
    !(otherSlotIds.value.length && otherSlotIds.value.includes(item.id));
  const filterStat = (item) => {
    if (dataStore.selectedStat === "none") return true;
    return item.attrs.some((attr) => {
      const req = showUseful ? checkRequirements(attr.requirements) : true;
      return (
        req &&
        attr.stats.some((stats) => {
          return stats.type === dataStore.selectedStat;
        })
      );
    });
  };
  const filterBannedKeywords = (item) => {
    const otherSlotsItems = Object.entries(ctx.gearSlots.value)
      .filter(
        ([slot, item]) =>
          item && slot !== props.slotName && slot.includes(props.gearType)
      )
      .map(([, item]) => item);
    const equippedKeywords = otherSlotsItems.flatMap((item) => item.keywords);
    const bannedKeywords = equippedKeywords.flatMap(
      (keyword) => dataStore.keywordsMap[keyword]?.bannedKeywords || []
    );
    const commonKeywords = intersect(item.keywords, bannedKeywords);
    return commonKeywords.length === 0;
  };
  const filterHidden = (item) => !item.hidden;
  const filterEmbargo = (item) =>
    !(
      ctx.embargoedItems.value.has(item.id) &&
      !(item.id in ctx.ownedItems.value)
    );

  return slotItems
    .map((item) => {
      const { id, type, gearType, egg } = item;
      const isCrafted = type === "crafted";
      const isConsumable = type === "consumable";
      const isPet = Boolean(egg);
      const isRing = gearType === "ring";

      const owned = id in ctx.ownedItems.value;
      const hidden = owned ? ctx.ownedItems.value[id].hidden : false;
      let quality = item.quality;
      let quality2 = null;

      if (owned) {
        if (isCrafted || isPet) {
          quality = ctx.ownedItems.value[id].quality;
        }
        quality2 = ctx.ownedItems.value[id].quality2;
      }

      if (isConsumable) {
        if (showOwned) {
          quality = owned ? ctx.ownedItems.value[id].quality : null;
          quality2 = owned ? ctx.ownedItems.value[id].quality2 : null;
        } else {
          quality = consumableQualityOptions[0].value;
          quality2 = consumableQualityOptions[1].value;
        }
      } else if (isRing) {
        quality2 = owned ? ctx.ownedItems.value[id].quality2 : item.quality2;
      }

      const attrs =
        dataStore.selectedStat !== "none" ? usedAttrs(item, quality) : [];
      const stats = attrs.flatMap(({ stats }) => stats);

      const out = [
        {
          ...item,
          hidden,
          quality,
          attrs,
          stats,
        },
      ];
      if (
        ["ring", "consumable"].includes(props.gearType) &&
        quality2 &&
        quality2 !== quality
      ) {
        const attrs2 =
          dataStore.selectedStat !== "none" ? usedAttrs(item, quality2) : [];
        const stats2 = attrs2.flatMap(({ stats }) => stats);

        out.push({
          ...item,
          hidden,
          quality: quality2,
          attrs: attrs2,
          stats: stats2,
        });
      }

      return out;
    })
    .flat()
    .filter(
      (item) =>
        filterActivity(item) &&
        filterSearch(item) &&
        filterOwned(item) &&
        filterEquipped(item) &&
        filterStat(item) &&
        filterBannedKeywords(item) &&
        filterHidden(item) &&
        filterEmbargo(item)
    )
    .sort((a, b) => {
      if (dataStore.selectedStat === "none")
        return itemQualityNameSort(a, b, true);
      const aStat = a.stats.find((s) => s.type === dataStore.selectedStat);
      const bStat = b.stats.find((s) => s.type === dataStore.selectedStat);
      if (!aStat && !bStat) return 0;
      if (!aStat) return 1;
      if (!bStat) return -1;

      const aValue = aStat.isNegative
        ? -Math.abs(aStat.value)
        : Math.abs(aStat.value);
      const bValue = bStat.isNegative
        ? -Math.abs(bStat.value)
        : Math.abs(bStat.value);
      return bValue - aValue;
    });
});

const handleClick = (item) => {
  emit("selectItem", item);
};
</script>

<template>
  <div class="search-wrapper">
    <div class="stat-filter-select">
      <label for="stat-filter">Filter stat:</label>
      <ws-icon
        v-if="dataStore.selectedStat !== 'none'"
        :icon-path="dataStore.filterStat.icon"
        size="sm"
      />
      <select id="stat-filter" v-model="dataStore.selectedStat">
        <option value="none">None</option>
        <option
          v-for="stat in dataStore.mainStats"
          :key="stat"
          :value="stat.type"
        >
          {{ stat.name }}
        </option>
      </select>
    </div>

    <input
      ref="searchInput"
      v-model="searchTerm"
      type="text"
      placeholder="Search..."
      class="gear-search"
    />
    <div class="items-wrapper">
      <search-item-display
        v-for="(item, index) in filteredItems"
        :key="`${item.id}-${index}`"
        :item="item"
        :highlight-stat="dataStore.selectedStat"
        :slot-name="slotName"
        @click="handleClick(item)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  background-color: $boxDarkBackground;
  border: 2px solid $boxDarkOutline;
  border-radius: $sm $sm 0 0;
}

.gear-search {
  width: 100%;
  padding: $sm;
  border-bottom: 1px solid $boxPrimaryOutline;
  box-sizing: border-box;

  &:focus {
    outline: 1px solid $chipOutline;
  }
}

.stat-filter-select {
  display: flex;
  width: 100%;
  align-items: center;
  gap: $xxs;
  padding: $xxs;
  box-sizing: border-box;

  select {
    padding: $xxxs $xxs;
    border-radius: $sm;
    border: 1px solid $boxPrimaryOutline;
    background-color: $bgPrimary;

    &:focus {
      outline: 1px solid $chipOutline;
    }
  }
}

.items-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;

  display: flex;
  flex-direction: column;
  gap: $xxxs;
  background-color: $bgPrimary;
}
</style>
