<script setup>
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useGearContext } from "@/composables/context/useGearContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";

const activityStore = useActivityStore();

const gs1Location = ref(null);
const gs2Location = ref(null);
const gs1LocationIdx = ref(0);
const gs2LocationIdx = ref(0);

const gs1Ctx = useGearContext(0, { location: gs1Location });
const gs2Ctx = useGearContext(1, { location: gs2Location });

const borderClass = computed(
  () => `border-${gs1Ctx.activity.value?.relatedSkillsList[0]}`
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
  const { id } = gs1Ctx.activity.value;
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
  <comparison-table-shell
    title="Activity Info"
    wrapped
    :border-class="borderClass"
  >
    <tr
      v-for="({ title, c1, c2, comp }, index) in tableRows"
      :key="`row-${index}`"
    >
      <td>{{ title }}</td>
      <td :class="{ positive: comp > 0, negative: comp < 0 }">
        {{ c1 }}
      </td>
      <td :class="{ positive: comp < 0, negative: comp > 0 }">
        {{ c2 }}
      </td>
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
  </comparison-table-shell>
</template>
