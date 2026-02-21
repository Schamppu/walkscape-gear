<script setup>
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useGearContext } from "@/composables/context/useGearContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { useFineMaterials } from "@/composables/useFineMaterialsCalculations";
import { n } from "@/utils/number.ts";
import EmitServiceBubble from "@/components/common/EmitServiceBubble.vue";
import ComparisonValueRow from "./table/ComparisonValueRow.vue";
import EditableComparisonRow from "./table/EditableComparisonRow.vue";
import CraftingQualityComparison from "./CraftingQualityComparison.vue";

const activityStore = useActivityStore();
const itemsStore = useItemsStore();

const gs1Location = ref(null);
const gs2Location = ref(null);
const gs1Locations = ref(null);
const gs2Locations = ref(null);
const gs1LocationIdx = ref(0);
const gs2LocationIdx = ref(0);

const gs1Service = ref(null);
const gs2Service = ref(null);
const gs1ServiceIdx = ref(0);
const gs2ServiceIdx = ref(0);

const gs1Ctx = useGearContext(0, {
  location: gs1Location,
  service: gs1Service,
});
const gs2Ctx = useGearContext(1, {
  location: gs2Location,
  service: gs2Service,
});

const { canUseFineMaterials, xpRewardsMultiplier, useFine } =
  useFineMaterials(gs1Ctx);

const borderClass = computed(
  () => `border-${gs1Ctx.recipe.value?.relatedSkills[0]}`,
);

const rewardCount = computed(() => {
  const { itemRewards } = gs1Ctx.recipe.value;
  return Object.values(itemRewards)[0];
});

const sm1 = useSkillModifiers(gs1Ctx);
const sm2 = useSkillModifiers(gs2Ctx);

const resultHasCO = computed(() => {
  const [itemId] = Object.keys(gs1Ctx.recipe.value.itemRewards);
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

  const xpPerStepRows = sm1["xpPerStep"].value.map(({ skill, value }, idx) => {
    const v1 = value * xpRewardsMultiplier.value;
    const v2 = sm2["xpPerStep"].value[idx].value * xpRewardsMultiplier.value;
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

const updateService = async ({ service, index, gearSetIndex }) => {
  if (gearSetIndex === 0) {
    gs1ServiceIdx.value = index;
    gs1Service.value = service;

    if (!gs2Locations.value) {
      gs2Locations.value = activityStore.locations;
      updateLocation({
        location: gs2Locations.value[0],
        index: 0,
        gearSetIndex: 1,
      });
    }

    await activityStore.loadServiceLocations(service.id, true).then((locs) => {
      gs1Locations.value = locs;
    });
  }
  if (gearSetIndex === 1) {
    gs2ServiceIdx.value = index;
    gs2Service.value = service;

    if (!gs1Locations.value) {
      gs1Locations.value = activityStore.locations;
      updateLocation({
        location: gs1Locations.value[0],
        index: 0,
        gearSetIndex: 0,
      });
    }

    await activityStore.loadServiceLocations(service.id, true).then((locs) => {
      gs2Locations.value = locs;
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
  <label v-if="canUseFineMaterials">
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
    :use-fine-materials="useFine"
    :gs1Ctx="gs1Ctx"
    :gs2Ctx="gs2Ctx"
    :border-class="borderClass"
  />
</template>
