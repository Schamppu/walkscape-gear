<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/store/settings";
import { useGearStore } from "@/store/gear";
import WsIcon from "@/components/common/WsIcon.vue";
import useBaseContext from "@/composables/context/useBaseContext";
import { useLootTables } from "@/composables/useLootTables";
import { icons } from "@/constants/iconPaths";
import { snakeToTitle } from "@/utils/string";
import { n } from "@/utils/number";
import AggregateDrops from "../drops/AggregateDrops.vue";

const settingsStore = useSettingsStore();
const { activitySettings } = storeToRefs(settingsStore);

const gearStore = useGearStore();
const ctx = useBaseContext();

const gs1Ctx = {
  ...ctx,
  gearSlots: computed(() => gearStore.gearSlots[0]),
  equippedGear: computed(
    () => Object.values(gearStore.gearSlots[0]).filter(Boolean) || []
  ),
  filledGearSlots: computed(() =>
    Object.entries(gearStore.gearSlots[0]).filter(([, item]) => Boolean(item))
  ),
};

const gs2Ctx = {
  ...ctx,
  gearSlots: computed(() => gearStore.gearSlots[1]),
  equippedGear: computed(
    () => Object.values(gearStore.gearSlots[1]).filter(Boolean) || []
  ),
  filledGearSlots: computed(() =>
    Object.entries(gearStore.gearSlots[1]).filter(([, item]) => Boolean(item))
  ),
};

const { dropItemInfoMap: drops1 } = useLootTables(gs1Ctx);
const { dropItemInfoMap: drops2 } = useLootTables(gs2Ctx);

const dropsMap = computed(() => {
  const A = drops1.value;
  const B = drops2.value;

  const both = [];
  const onlyA = [];
  const onlyB = [];

  // Walk A once
  for (const key in A) {
    if (key in B) {
      both.push(key);
    } else {
      onlyA.push(key);
    }
  }

  // Walk B once
  for (const key in B) {
    if (!(key in A)) {
      onlyB.push(key);
    }
  }

  const getItemInfo = (source, key) => {
    const info = source[key];
    return {
      name: snakeToTitle(info.id),
      icon: info.icon,
      item: info.stepsPerItem,
      normal: info.stepsPerNormal,
      fine: info.stepsPerFine,
      rare: info.stepsPerRare,
    };
  };

  const bothItems = both.map((key) => {
    const item = getItemInfo(A, key);
    const item2 = getItemInfo(B, key);

    const comp = item.item - item2.item;
    const normalComp = item.normal - item2.normal;
    const fineComp = item.fine - item2.fine;
    const rareComp = item.rare - item2.rare;

    return {
      item: {
        name: item.name,
        icon: item.icon,
        comp,
        normalComp,
        fineComp,
        rareComp,
      },
      g1: item,
      g2: item2,
    };
  });

  const aItems = onlyA.map((key) => {
    const item = getItemInfo(A, key);
    return {
      item,
      g1: item,
      g2: {},
    };
  });

  const bItems = onlyB.map((key) => {
    const item = getItemInfo(B, key);
    return {
      item,
      g1: {},
      g2: item,
    };
  });

  return [...bothItems, ...aItems, ...bItems];
});
</script>

<template>
  <details open>
    <summary>Drops Info</summary>
    <table class="comparison-table">
      <thead>
        <tr>
          <th></th>
          <th>Gear set 1</th>
          <th>Gear set 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-line">
              <p>Totals /1k</p>
              <ws-icon :icon-path="icons.steps" size="sm" />
            </div>
          </td>
          <td><aggregate-drops :context="gs1Ctx" :compact="true" /></td>
          <td><aggregate-drops :context="gs2Ctx" :compact="true" /></td>
        </tr>
        <tr v-for="{ item, g1, g2 } in dropsMap" :key="item.name">
          <td>
            <div class="item-line">
              <ws-icon :icon-path="item.icon" size="md" />
              <p>{{ item.name }}</p>
            </div>
          </td>
          <td>
            <div v-if="g1.item > 0" class="step-counts">
              <div class="steps-line border-common">
                <span
                  v-if="activitySettings.shownDropRate.display === 1"
                  :class="{
                    positive: item.normalComp < 0,
                    negative: item.normalComp > 0,
                  }"
                  >{{ n(g1.normal, g1.normal < 100 ? 1 : 0) }}</span
                >
                <span
                  v-else
                  :class="{
                    positive: item.comp < 0,
                    negative: item.comp > 0,
                  }"
                  >{{ n(g1.item, g1.item < 100 ? 1 : 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
              <div v-if="g1.fine" class="steps-line border-fine">
                <span
                  :class="{
                    positive: item.fineComp < 0,
                    negative: item.fineComp > 0,
                  }"
                  >{{ n(g1.fine, 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
              <div v-if="g1.rare" class="steps-line border-petRare">
                <span
                  :class="{
                    positive: item.rareComp < 0,
                    negative: item.rareComp > 0,
                  }"
                  >{{ n(g1.rare, 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
            </div>
          </td>
          <td>
            <div v-if="g2.item > 0" class="step-counts">
              <div class="steps-line border-common">
                <span
                  v-if="activitySettings.shownDropRate.display === 1"
                  :class="{
                    positive: item.normalComp > 0,
                    negative: item.normalComp < 0,
                  }"
                  >{{ n(g2.normal, g2.normal < 100 ? 1 : 0) }}</span
                >
                <span
                  v-else
                  :class="{
                    positive: item.comp > 0,
                    negative: item.comp < 0,
                  }"
                  >{{ n(g2.item, g2.item < 100 ? 1 : 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
              <div v-if="g2.fine" class="steps-line border-fine">
                <span
                  :class="{
                    positive: item.fineComp > 0,
                    negative: item.fineComp < 0,
                  }"
                  >{{ n(g2.fine, 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
              <div v-if="g2.rare" class="steps-line border-petRare">
                <span
                  :class="{
                    positive: item.rareComp > 0,
                    negative: item.rareComp < 0,
                  }"
                  >{{ n(g2.rare, 0) }}</span
                >
                <ws-icon :iconPath="icons.steps" size="xs" />
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>

<style lang="scss" scoped>
.comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  tr {
    &:hover {
      background-color: $boxTransparentDarkOutline;
    }
  }

  th,
  td {
    padding: $xxs $sm;
    border-bottom: 1px solid $chipOutline;
    text-align: center;
  }
  th {
    background: $boxPrimaryBackground;
  }

  tr:first-child th:first-child {
    border-top-left-radius: $sm;
  }
  tr:first-child th:last-child {
    border-top-right-radius: $sm;
  }

  tr:last-child td:first-child {
    border-bottom-left-radius: $sm;
  }
  tr:last-child td:last-child {
    border-bottom-right-radius: $sm;
  }
}

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

    &.disabled {
      opacity: 0.7;
    }

    span {
      text-wrap: nowrap;
      text-align: left;
    }
  }
}

.item-line {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: $xs;

  p {
    text-align: left;
  }
}
</style>
