<script setup lang="ts">
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { useComparisonRows } from "@/composables/useComparisonRows";
import { n } from "@/utils/number";
import type { ComputedRef } from "vue";
import type { BaseContext } from "@/composables/context/useBaseContext";
import type { LocationDetail } from "@/domain/types/location";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";
import EditableComparisonRow from "./table/EditableComparisonRow.vue";

const props = defineProps<{
  gs1Ctx: BaseContext;
  gs2Ctx: BaseContext;
}>();

const emit = defineEmits<{
  "update:gs1Location": [location: LocationDetail | null];
  "update:gs2Location": [location: LocationDetail | null];
}>();

type LocationChangeInfo = {
  location: LocationDetail;
  index: number;
  gearSetIndex: number;
};

const activityStore = useActivityStore();

const findIdx = (list: { id: string }[] | null | undefined, id: string | undefined): number =>
  Math.max(0, list?.findIndex((item) => item.id === id) ?? 0);

const gs1LocationIdx = ref(
  findIdx(activityStore.locations, props.gs1Ctx.location.value?.id),
);
const gs2LocationIdx = ref(
  findIdx(activityStore.locations, props.gs2Ctx.location.value?.id),
);

const borderClass = computed(
  () => `border-${props.gs1Ctx.activity.value?.relatedSkillsList[0]}`,
);

const sm1 = useSkillModifiers(props.gs1Ctx as unknown as SkillModifiersContext);
const sm2 = useSkillModifiers(props.gs2Ctx as unknown as SkillModifiersContext);

const basicRows = useComparisonRows(sm1 as unknown as Record<string, ComputedRef<number>>, sm2 as unknown as Record<string, ComputedRef<number>>, [
  {
    title: "Work Efficiency",
    key: "workEfficiency",
    isPercent: true,
    negative: true,
  },
  { title: "Steps per action", key: "stepsPerAction" },
  { title: "Steps per reward roll", key: "stepsPerRewardRoll" },
]);

const xpPerStepRows = computed(() =>
  sm1.xpPerStep.value.map(({ skill, value }, idx) => {
    const v1 = value;
    const v2 = sm2.xpPerStep.value[idx].value;
    return {
      title: `${skill !== "xp" ? skill : "total"} xp`,
      left: n(v1, 2),
      right: n(v2, 2),
      comp: v1 - v2,
    };
  }),
);

const tableRows = computed(() => [...basicRows.value, ...xpPerStepRows.value]);

const updateLocation = ({ location, index, gearSetIndex }: LocationChangeInfo) => {
  if (gearSetIndex === 0) {
    gs1LocationIdx.value = index;
    emit("update:gs1Location", location);
  }
  if (gearSetIndex === 1) {
    gs2LocationIdx.value = index;
    emit("update:gs2Location", location);
  }
};

const onRowChange = (info: LocationChangeInfo) => {
  if ("location" in info) updateLocation(info);
};

const editableRows = computed(() => {
  const { id } = props.gs1Ctx.activity.value ?? { id: "" };
  const isTravel = id === "travelling";
  const locationsRow = {
    title: "Location",
    component: EmitLocationBubble,
    columns: [
      {
        items: !isTravel ? activityStore.locations : [],
        itemProps: (item: unknown, index: number) => ({
          location: item,
          index,
          selected: gs1LocationIdx.value === index,
        }),
      },
      {
        items: !isTravel ? activityStore.locations : [],
        itemProps: (item: unknown, index: number) => ({
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
