<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useSkillModifiers, type SkillModifiersContext } from "@/composables/useSkillModifiers";
import { useComparisonRows } from "@/composables/useComparisonRows";
import { useFineMaterials, type FineMaterialsContext } from "@/composables/useFineMaterialsCalculations";
import { n } from "@/utils/number";
import EmitServiceBubble from "@/components/common/EmitServiceBubble.vue";
import type { BaseContext } from "@/composables/context/useBaseContext";
import type { LocationDetail } from "@/domain/types/location";
import type { ServiceDetail } from "@/domain/types/service";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { ComputedRef } from "vue";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";
import EditableComparisonRow from "./table/EditableComparisonRow.vue";
import CraftingQualityComparison from "./CraftingQualityComparison.vue";

const props = defineProps<{
  gs1Ctx: BaseContext;
  gs2Ctx: BaseContext;
}>();

const emit = defineEmits<{
  "update:gs1Service": [service: ServiceDetail];
  "update:gs2Service": [service: ServiceDetail];
  "update:gs1Location": [location: LocationDetail | null];
  "update:gs2Location": [location: LocationDetail | null];
}>();

type LocationChangeInfo = { location: LocationDetail; index: number; gearSetIndex: number };
type ServiceChangeInfo = { service: ServiceDetail; index: number; gearSetIndex: number };
type RowChangeInfo = LocationChangeInfo | ServiceChangeInfo;

const activityStore = useActivityStore();
const itemsStore = useItemsStore();

const gs1Locations = ref<LocationDetail[] | null>(null);
const gs2Locations = ref<LocationDetail[] | null>(null);

const findIdx = (list: { id: string }[] | null | undefined, id: string | undefined): number =>
  Math.max(0, list?.findIndex((item) => item.id === id) ?? 0);

const gs1ServiceIdx = ref(
  findIdx(activityStore.services, props.gs1Ctx.service.value?.id),
);
const gs2ServiceIdx = ref(
  findIdx(activityStore.services, props.gs2Ctx.service.value?.id),
);
const gs1LocationIdx = ref(0);
const gs2LocationIdx = ref(0);

onMounted(async () => {
  const [locs1, locs2] = await Promise.all([
    props.gs1Ctx.service.value
      ? activityStore.loadServiceLocations(props.gs1Ctx.service.value.id, true)
      : Promise.resolve(activityStore.locations),
    props.gs2Ctx.service.value
      ? activityStore.loadServiceLocations(props.gs2Ctx.service.value.id, true)
      : Promise.resolve(activityStore.locations),
  ]);
  gs1Locations.value = locs1;
  gs2Locations.value = locs2;
  gs1LocationIdx.value = findIdx(locs1, props.gs1Ctx.location.value?.id);
  gs2LocationIdx.value = findIdx(locs2, props.gs2Ctx.location.value?.id);
});

const { xpRewardsMultiplier, fineMode, useFine } = useFineMaterials(
  props.gs1Ctx as unknown as FineMaterialsContext,
);

const borderClass = computed(
  () => `border-${(props.gs1Ctx.recipe.value as RecipeDetail)?.relatedSkills[0]}`,
);

const rewardCount = computed(() => {
  const { itemRewards } = props.gs1Ctx.recipe.value as RecipeDetail;
  return Object.values(itemRewards)[0];
});

const sm1 = useSkillModifiers(props.gs1Ctx as unknown as SkillModifiersContext);
const sm2 = useSkillModifiers(props.gs2Ctx as unknown as SkillModifiersContext);

const resultHasCO = computed(() => {
  const [itemId] = Object.keys((props.gs1Ctx.recipe.value as RecipeDetail).itemRewards);
  return (
    itemId in itemsStore.allGearItems &&
    itemsStore.allGearItems[itemId].type === "crafted"
  );
});

const basicRows = useComparisonRows(
  sm1 as unknown as Record<string, ComputedRef<number>>,
  sm2 as unknown as Record<string, ComputedRef<number>>,
  computed(() => [
    {
      title: "Work Efficiency",
      key: "workEfficiency",
      isPercent: true,
      negative: true,
    },
    { title: "Steps per action", key: "stepsPerAction" },
    {
      title: "Steps per item",
      key: "stepsPerRewardRoll",
      modifyValue: (v) => v / rewardCount.value,
    },
    { title: "Crafts per material", key: "craftsPerMaterial", negative: true },
  ]),
);

const xpPerStepRows = computed(() => {
  const sm1XpBySkill = Object.fromEntries(
    sm1.xpPerStep.value.map((r) => [r.skill, r.value]),
  );
  const sm2XpBySkill = Object.fromEntries(
    sm2.xpPerStep.value.map((r) => [r.skill, r.value]),
  );
  const allXpSkills = [
    ...new Set([
      ...sm1.xpPerStep.value.map((r) => r.skill),
      ...sm2.xpPerStep.value.map((r) => r.skill),
    ]),
  ];
  return allXpSkills.map((skill) => {
    const v1 = (sm1XpBySkill[skill] ?? 0) * xpRewardsMultiplier.value;
    const v2 = (sm2XpBySkill[skill] ?? 0) * xpRewardsMultiplier.value;
    return {
      title: `${skill !== "xp" ? skill : "total"} xp`,
      left: n(v1, 2),
      right: n(v2, 2),
      comp: v1 - v2,
    };
  });
});

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

const updateService = async ({ service, index, gearSetIndex }: ServiceChangeInfo) => {
  if (gearSetIndex === 0) {
    gs1ServiceIdx.value = index;
    emit("update:gs1Service", service);

    await activityStore.loadServiceLocations(service.id, true).then((locs) => {
      gs1Locations.value = locs;
    });
    updateLocation({
      location: gs1Locations.value![0],
      index: 0,
      gearSetIndex: 0,
    });
  }
  if (gearSetIndex === 1) {
    gs2ServiceIdx.value = index;
    emit("update:gs2Service", service);

    await activityStore.loadServiceLocations(service.id, true).then((locs) => {
      gs2Locations.value = locs;
    });
    updateLocation({
      location: gs2Locations.value![0],
      index: 0,
      gearSetIndex: 1,
    });
  }
};

const onRowChange = async (info: RowChangeInfo) => {
  if ("location" in info) updateLocation(info);
  if ("service" in info) await updateService(info);
};

const editableRows = computed(() => {
  const serviceRow = {
    title: "Service",
    component: EmitServiceBubble,
    columns: [
      {
        items: activityStore.services,
        itemProps: (item: unknown, index: number) => ({
          service: item,
          index,
          selected: index === gs1ServiceIdx.value,
        }),
      },
      {
        items: activityStore.services,
        itemProps: (item: unknown, index: number) => ({
          service: item,
          index,
          selected: index === gs2ServiceIdx.value,
        }),
      },
    ],
  };

  const locationsRow = {
    title: "Location",
    component: EmitLocationBubble,
    columns: [
      {
        items: gs1Locations.value
          ? gs1Locations.value
          : activityStore.locations,
        itemProps: (item: unknown, index: number) => ({
          location: item,
          index,
          selected: index === gs1LocationIdx.value,
        }),
      },
      {
        items: gs2Locations.value
          ? gs2Locations.value
          : activityStore.locations,
        itemProps: (item: unknown, index: number) => ({
          location: item,
          index,
          selected: index === gs2LocationIdx.value,
        }),
      },
    ],
  };

  return [serviceRow, locationsRow];
});
</script>

<template>
  <label>
    <input type="checkbox" v-model="activityStore.useFineMaterials" />
    Fine Materials
  </label>
  <comparison-table-shell
    title="Recipe Info"
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
  <crafting-quality-comparison
    v-if="resultHasCO"
    :fine-mode="fineMode"
    :gs1Ctx="props.gs1Ctx"
    :gs2Ctx="props.gs2Ctx"
    :border-class="borderClass"
  />
</template>
