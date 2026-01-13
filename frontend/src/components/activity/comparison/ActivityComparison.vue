<script setup>
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import useBaseContext from "@/composables/useBaseContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";

const activityStore = useActivityStore();
const gearStore = useGearStore();

const gs1Location = ref(null);
const gs2Location = ref(null);
const gs1LocationIdx = ref(0);
const gs2LocationIdx = ref(0);

const ctx = useBaseContext();
const gs1Ctx = {
  ...ctx,
  location: computed(() =>
    gs1Location.value ? gs1Location.value : ctx.location.value
  ),
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
  location: computed(() =>
    gs2Location.value ? gs2Location.value : ctx.location.value
  ),
  gearSlots: computed(() => gearStore.gearSlots[1]),
  equippedGear: computed(
    () => Object.values(gearStore.gearSlots[1]).filter(Boolean) || []
  ),
  filledGearSlots: computed(() =>
    Object.entries(gearStore.gearSlots[1]).filter(([, item]) => Boolean(item))
  ),
};

const borderClass = computed(
  () => `border-${ctx.activity.value?.relatedSkillsList[0]}`
);

const sm1 = useSkillModifiers(gs1Ctx);
const sm2 = useSkillModifiers(gs2Ctx);

const tableRows = computed(() => {
  const getBothValues = (key, isPercent = false, negative = false) => {
    const multi = isPercent ? 100 : 1;
    const v1 = sm1[key].value * multi;
    const v2 = sm2[key].value * multi;

    return {
      c1: `${n(v1, 2)}${isPercent ? "%" : ""}`,
      c2: `${n(v2, 2)}${isPercent ? "%" : ""}`,
      comp: negative ? v1 - v2 : v2 - v1,
    };
  };

  const basicStatsRows = [
    {
      title: "Work Efficiency",
      ...getBothValues("workEfficiency", true, true),
    },
    {
      title: "Steps per action",
      ...getBothValues("stepsPerAction"),
    },
    {
      title: "Steps per reward roll",
      ...getBothValues("stepsPerRewardRoll"),
    },
  ];

  const xpPerStepRows = sm1["xpPerStep"].value.map(({ skill, value }, idx) => {
    const v1 = value;
    const v2 = sm2["xpPerStep"].value[idx].value;
    const comp = v1 - v2;

    return {
      title: `${skill !== "xp" ? skill : "total"} xp`,
      c1: n(v1, 2),
      c2: n(v2, 2),
      comp,
    };
  });

  return [...basicStatsRows, ...xpPerStepRows];
});

const updateLocation = ({ location, index, gearSetIndex }) => {
  if (gearSetIndex === 0) {
    gs1LocationIdx.value = index;
    gs1Location.value = location;
  }
  if (gearSetIndex === 1) {
    gs2LocationIdx.value = index;
    gs2Location.value = location;
  }
};

const onRowChange = (info) => {
  if ("location" in info) updateLocation(info);
};

const editableRows = computed(() => {
  const { id } = ctx.activity.value;
  const isTravel = id === "travelling";
  const locationsRow = [
    {
      title: "Location",
      component: EmitLocationBubble,
      items: !isTravel ? activityStore.locations : [],
      itemProps: (item, index) => ({
        location: item,
        index,
        selected: index === gs1LocationIdx.value,
      }),
    },
    {
      title: "Location",
      component: EmitLocationBubble,
      items: !isTravel ? activityStore.locations : [],
      itemProps: (item, index) => ({
        location: item,
        index,
        selected: index === gs2LocationIdx.value,
      }),
    },
  ];

  return [locationsRow];
});
</script>

<template>
  <div :class="['wrapper', borderClass]">
    <table class="comparison-table">
      <thead>
        <tr>
          <th></th>
          <th>Gear set 1</th>
          <th>Gear set 2</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="({ title, c1, c2, comp }, index) in tableRows"
          :key="`row-${index}`"
        >
          <td>{{ title }}</td>
          <td :class="{ positive: comp > 0, negative: comp < 0 }">{{ c1 }}</td>
          <td :class="{ positive: comp < 0, negative: comp > 0 }">{{ c2 }}</td>
        </tr>

        <tr v-for="(info, index) in editableRows" :key="`row-${index}`">
          <td>{{ info[0].title }}</td>
          <td
            v-for="({ items, component, itemProps }, cInd) in info"
            :key="`td-${index}-${cInd}`"
          >
            <div class="info-row">
              <component
                v-for="(item, idx) in items"
                :is="component"
                v-bind="itemProps(item, idx)"
                :gear-set-index="cInd"
                :key="idx"
                @change="onRowChange"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  border-radius: $sm;
}

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

    &.negative {
      color: $txNegative;
    }

    &.positive {
      color: $txPositive;
    }
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
</style>
