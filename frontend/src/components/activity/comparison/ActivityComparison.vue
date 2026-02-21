<script setup>
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useGearContext } from "@/composables/context/useGearContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number.ts";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";
import EditableComparisonRow from "./table/EditableComparisonRow.vue";

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
      left: `${n(v1, 2)}${isPercent ? "%" : ""}`,
      right: `${n(v2, 2)}${isPercent ? "%" : ""}`,
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
      left: n(v1, 2),
      right: n(v2, 2),
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
  const locationsRow = {
    title: "Location",
    component: EmitLocationBubble,
    columns: [
      {
        items: !isTravel ? activityStore.locations : [],
        itemProps: (item, index) => ({
          location: item,
          index,
          selected: gs1LocationIdx.value === index,
        }),
      },
      {
        items: !isTravel ? activityStore.locations : [],
        itemProps: (item, index) => ({
          location: item,
          index,
          selected: gs2LocationIdx.value === index,
        }),
      },
    ],
  };

  return [locationsRow];
});
</script>

<template>
  <comparison-table-shell
    title="Activity Info"
    wrapped
    :border-class="borderClass"
  >
    <comparison-value-row
      v-for="row in tableRows"
      :key="row.title"
      v-bind="row"
    />
    <editable-comparison-row
      v-for="row in editableRows"
      :key="row.title"
      v-bind="row"
      @change="onRowChange"
    />
  </comparison-table-shell>
</template>
