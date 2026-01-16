<script setup>
import { computed, ref } from "vue";
import { useActivityStore } from "@/store/activity";
import ComparisonTableShell from "./table/ComparisonTableShell.vue";
import EmitLocationBubble from "@/components/common/EmitLocationBubble.vue";
import { useGearContext } from "@/composables/context/useGearContext";
import { useSkillModifiers } from "@/composables/useSkillModifiers";
import { n } from "@/utils/number";
import EmitServiceBubble from "@/components/common/EmitServiceBubble.vue";

const activityStore = useActivityStore();

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

const borderClass = computed(
  () => `border-${gs1Ctx.recipe.value?.relatedSkills[0]}`
);

const rewardCount = computed(() => {
  const { itemRewards } = gs1Ctx.recipe.value;
  return Object.values(itemRewards)[0];
});

const sm1 = useSkillModifiers(gs1Ctx);
const sm2 = useSkillModifiers(gs2Ctx);

const tableRows = computed(() => {
  const getBothValues = (
    key,
    isPercent = false,
    negative = false,
    modifyValue = (item) => item
  ) => {
    const multi = isPercent ? 100 : 1;
    const v1 = sm1[key].value * multi;
    const v2 = sm2[key].value * multi;

    return {
      c1: `${n(modifyValue(v1), 2)}${isPercent ? "%" : ""}`,
      c2: `${n(modifyValue(v2), 2)}${isPercent ? "%" : ""}`,
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
        (item) => item / rewardCount.value
      ),
    },
    {
      title: "Crafts per material",
      ...getBothValues("craftsPerMaterial", false, true),
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
  const serviceRow = [
    {
      title: "Service",
      component: EmitServiceBubble,
      items: activityStore.services,
      itemProps: (item, index) => ({
        service: item,
        index,
        selected: index === gs1ServiceIdx.value,
      }),
    },
    {
      title: "Service",
      component: EmitServiceBubble,
      items: activityStore.services,
      itemProps: (item, index) => ({
        service: item,
        index,
        selected: index === gs2ServiceIdx.value,
      }),
    },
  ];

  const locationsRow = [
    {
      title: "Location",
      component: EmitLocationBubble,
      items: gs1Locations.value ? gs1Locations.value : activityStore.locations,
      itemProps: (item, index) => ({
        location: item,
        index,
        selected: index === gs1LocationIdx.value,
      }),
    },
    {
      title: "Location",
      component: EmitLocationBubble,
      items: gs2Locations.value ? gs2Locations.value : activityStore.locations,
      itemProps: (item, index) => ({
        location: item,
        index,
        selected: index === gs2LocationIdx.value,
      }),
    },
  ];

  return [serviceRow, locationsRow];
});
</script>

<template>
  <comparison-table-shell
    title="Recipe Info"
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
