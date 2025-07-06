<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import WsLabel from "@/components/common/WsLabel.vue";
import InfoBubble from "@/components/common/InfoBubble.vue";
import ServiceBubble from "@/components/common/ServiceBubble.vue";
import LocationBubble from "@/components/common/LocationBubble.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import { useSkillModifiers } from "@/utils/useSkillModifiers";
import { craftingQualityOptions } from "@/utils/quality";
import { isEmpty } from "@/utils/isEmpty";
import { n } from "@/utils/number";

const activityStore = useActivityStore();
const itemsStore = useItemsStore();
const useFineMaterials = ref(false);

const { recipe } = storeToRefs(activityStore);
const stats = computed(() => {
  const {
    maxWorkEfficiency,
    workEfficiency,
    craftingOutcome,
    stepsPerCompletion,
    craftsPerMaterial,
    xpRewards,
    xpPerStep,
  } = useSkillModifiers();

  return {
    maxWorkEfficiency: maxWorkEfficiency.value,
    workEfficiency: workEfficiency.value,
    craftingOutcome: craftingOutcome.value,
    stepsPerCompletion: stepsPerCompletion.value,
    craftsPerMaterial: craftsPerMaterial.value,
    xpRewards: xpRewards.value,
    xpPerStep: xpPerStep.value,
  };
});

const levelRequirement = computed(() => {
  const [level] = recipe.value.requirements
    .map(({ requirement }) => requirement)
    .filter(({ runtimeType }) => runtimeType === "skillLevel");
  return level || { level: 1, skill: "none" };
});

const borderClass = computed(
  () => `border-${activityStore.recipe?.relatedSkills[0]}`
);

const sections = computed(() => {
  const {
    id,
    workRequired,
    levelRequirementsMap,
    requiredKeywords,
    requirements,
  } = activityStore.recipe;

  return [
    {
      label: "Services",
      component: ServiceBubble,
      items: activityStore.services,
      itemProps: (item) => ({ service: item }),
    },
    {
      label: "Locations",
      component: LocationBubble,
      items: activityStore.locations,
      itemProps: (item) => ({ location: item }),
    },
  ].filter(({ items }) => !isEmpty(items));
});

const resultHasCO = computed(() => {
  const [itemId] = Object.keys(recipe.value.itemRewards);
  return (
    itemId in itemsStore.allItems &&
    itemsStore.allItems[itemId].type === "crafted"
  );
});

const craftingOdds = computed(() => {
  const { level: levelReq } = levelRequirement.value;
  const weights = [
    [1000, 4],
    [200, 4],
    [50, 4],
    [10, 4],
    [2.5, 2],
    [0.05, 0.05],
  ];

  let base = craftingQualityOptions
    .map((quality, index) => ({
      ...quality,
      qualityValue: quality.value,
      bandStart: index * 100,
      bandEnd: (index + 1) * (100 + levelReq),
      weightStart: weights[index][0],
      weightEnd: weights[index][1],
    }))
    .map((item) => {
      const { bandStart, bandEnd, weightStart, weightEnd } = item;
      return {
        ...item,
        slope: (weightStart - weightEnd) / (bandStart - bandEnd),
      };
    })
    .map((item) => {
      const { weightEnd, weightStart, slope, bandStart } = item;
      return {
        ...item,
        weight: Math.max(
          weightEnd,
          weightStart + slope * (stats.value.craftingOutcome - bandStart)
        ),
      };
    });

  if (!useFineMaterials.value) {
    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  } else {
    for (let i = 0; i < base.length - 1; i++) {
      base[i].name = base[i + 1].name;
      base[i].qualityValue = base[i + 1].qualityValue;
    }
    base[4].weight = base[4].weight + base[5].weight;
    base = base.slice(0, -1);

    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  }

  const totalWeight = base.reduce((acc, item) => acc + item.weight, 0);
  const odds = base
    .map((item) => {
      const { qualityValue, name, weight } = item;
      return {
        qualityValue,
        name,
        value: weight / totalWeight,
        crafts: totalWeight / weight,
      };
    })
    .map((item) => {
      return {
        ...item,
        odds: `${n(item.value * 100, 2)}%`,
        materialsNeeded: Math.ceil(item.crafts / stats.value.craftsPerMaterial),
      };
    });

  return odds;
});
</script>

<template>
  <details open>
    <summary>Recipe Info</summary>
    <section :class="['recipe-info', borderClass]">
      <div class="info-section">
        <div class="info-row">
          <info-bubble
            label="Steps"
            :text="`${stats.stepsPerCompletion} / ${
              recipe.workRequired || 1000
            }`"
            :tooltip="`${stats.stepsPerCompletion} steps per action`"
            iconPath="assets/icons/text/general_icons/steps.png"
          />
          <info-bubble
            label="Work Efficiency"
            :text="`${n(stats.workEfficiency * 100)} / ${
              Math.round(stats.maxWorkEfficiency * 100) - 100
            }%`"
            :tooltip="`${Math.round(
              stats.workEfficiency * 100
            )}% work efficiency`"
            iconPath="assets/icons/text/stats/skilling/work_efficiency.png"
          />
          <skill-bubble
            label="Level"
            :skill="levelRequirement.skill"
            :text="`${levelRequirement.level}`"
            :tooltip-text="`Requires ${levelRequirement.level} ${levelRequirement.skill}`"
          />
          <skill-bubble
            label="XP"
            :skill="stats.xpRewards[0].skill"
            :text="`${n(stats.xpRewards[0].value)}`"
            :tooltip-text="`Rewards ${n(stats.xpRewards[0].value)} ${
              stats.xpRewards[0].skillText
            } XP`"
          />
          <skill-bubble
            label="XP / Step"
            :skill="stats.xpPerStep[0].skill"
            :text="`${n(stats.xpPerStep[0].value)}`"
            :tooltip-text="`Rewards ${n(stats.xpPerStep[0].value)} ${
              stats.xpRewards[0].skillText
            } XP per step`"
          />
          <info-bubble
            label="Crafts / Mat"
            :text="`${n(stats.craftsPerMaterial)}`"
            :tooltip="`${n(stats.craftsPerMaterial)} crafts / material`"
            iconPath="assets/icons/text/stats/skilling/double_result.png"
          />
        </div>
      </div>
      <div
        v-for="section in sections"
        class="info-section"
        :key="section.label"
      >
        <ws-label :label="section.label" />
        <div class="info-row">
          <component
            v-for="(item, idx) in section.items"
            :is="section.component"
            v-bind="section.itemProps(item)"
            :key="idx"
          />
        </div>
      </div>
      <div v-if="resultHasCO" class="info-section">
        <ws-label label="Crafting Odds" class="info-row" />
        <label>
          <input type="checkbox" v-model="useFineMaterials" />
          Fine Materials
        </label>
        <table class="crafting-odds-table">
          <thead>
            <tr>
              <th>Quality</th>
              <th>Chance</th>
              <th>Avg. Crafts</th>
              <th>Avg. Materials Needed</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in craftingOdds"
              :key="`${item.name}-${index}`"
            >
              <td :class="`color-${item.qualityValue}`">{{ item.name }}</td>
              <td>{{ item.odds }}</td>
              <td>{{ n(item.crafts, 2) }}</td>
              <td>{{ n(item.materialsNeeded) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.recipe-info {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: $sm;
  align-items: flex-start;

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}

.crafting-odds-table {
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: $xxs $sm;
    border-bottom: 1px solid $chipOutline;
    text-align: center;
  }
  th {
    background: $boxPrimaryBackground;
  }
}
</style>
