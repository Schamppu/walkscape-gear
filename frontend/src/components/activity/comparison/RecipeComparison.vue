<script setup>
import { computed, ref, onMounted } from "vue";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { useFineMaterials } from "@/composables/useFineMaterialsCalculations";
import { n } from "@/utils/number";
import EmitServiceBubble from "@/components/common/EmitServiceBubble.vue";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";
import EditableComparisonRow from "./table/EditableComparisonRow.vue";
import CraftingQualityComparison from "./CraftingQualityComparison.vue";

const props = defineProps({
  gs1Ctx: { type: Object, required: true },
  gs2Ctx: { type: Object, required: true },
});

const emit = defineEmits([
  "update:gs1Service",
  "update:gs2Service",
  "update:gs1Location",
  "update:gs2Location",
]);

const activityStore = useActivityStore();
const itemsStore = useItemsStore();

const gs1Locations = ref(null);
const gs2Locations = ref(null);

const findIdx = (list, id) =>
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
  props.gs1Ctx,
);

const borderClass = computed(
  () => `border-${props.gs1Ctx.recipe.value?.relatedSkills[0]}`,
);

const rewardCount = computed(() => {
  const { itemRewards } = props.gs1Ctx.recipe.value;
  return Object.values(itemRewards)[0];
});

const sm1 = useSkillModifiers(props.gs1Ctx);
const sm2 = useSkillModifiers(props.gs2Ctx);

const resultHasCO = computed(() => {
  const [itemId] = Object.keys(props.gs1Ctx.recipe.value.itemRewards);
  return (
    itemId in itemsStore.allGearItems &&
    itemsStore.allGearItems[itemId].type === "crafted"
  );
});

const tableRows = computed(() => {
  const getBothValues = (
    key,
    isPercent = false,
    negative = false,
    modifyValue = (item) => item,
  ) => {
    const multi = isPercent ? 100 : 1;
    const v1 = sm1[key].value * multi;
    const v2 = sm2[key].value * multi;

    return {
      left: `${n(modifyValue(v1), 2)}${isPercent ? "%" : ""}`,
      right: `${n(modifyValue(v2), 2)}${isPercent ? "%" : ""}`,
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
      title: "Steps per item",
      ...getBothValues(
        "stepsPerRewardRoll",
        false,
        false,
        (item) => item / rewardCount.value,
      ),
    },
    {
      title: "Crafts per material",
      ...getBothValues("craftsPerMaterial", false, true),
    },
  ];

  const sm1XpBySkill = Object.fromEntries(
    sm1["xpPerStep"].value.map((r) => [r.skill, r.value]),
  );
  const sm2XpBySkill = Object.fromEntries(
    sm2["xpPerStep"].value.map((r) => [r.skill, r.value]),
  );
  const allXpSkills = [
    ...new Set([
      ...sm1["xpPerStep"].value.map((r) => r.skill),
      ...sm2["xpPerStep"].value.map((r) => r.skill),
    ]),
  ];

  const xpPerStepRows = allXpSkills.map((skill) => {
    const v1 = (sm1XpBySkill[skill] ?? 0) * xpRewardsMultiplier.value;
    const v2 = (sm2XpBySkill[skill] ?? 0) * xpRewardsMultiplier.value;
    return {
      title: `${skill !== "xp" ? skill : "total"} xp`,
      left: n(v1, 2),
      right: n(v2, 2),
      comp: v1 - v2,
    };
  });

  return [...basicStatsRows, ...xpPerStepRows];
});

const updateLocation = ({ location, index, gearSetIndex }) => {
  if (gearSetIndex === 0) {
    gs1LocationIdx.value = index;
    emit("update:gs1Location", location);
  }
  if (gearSetIndex === 1) {
    gs2LocationIdx.value = index;
    emit("update:gs2Location", location);
  }
};

const updateService = async ({ service, index, gearSetIndex }) => {
  if (gearSetIndex === 0) {
    gs1ServiceIdx.value = index;
    emit("update:gs1Service", service);

    await activityStore.loadServiceLocations(service.id, true).then((locs) => {
      gs1Locations.value = locs;
    });
    updateLocation({
      location: gs1Locations.value[0],
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
      location: gs2Locations.value[0],
      index: 0,
      gearSetIndex: 1,
    });
  }
};

const onRowChange = async (info) => {
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
        itemProps: (item, index) => ({
          service: item,
          index,
          selected: index === gs1ServiceIdx.value,
        }),
      },
      {
        items: activityStore.services,
        itemProps: (item, index) => ({
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
        itemProps: (item, index) => ({
          location: item,
          index,
          selected: index === gs1LocationIdx.value,
        }),
      },
      {
        items: gs2Locations.value
          ? gs2Locations.value
          : activityStore.locations,
        itemProps: (item, index) => ({
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
