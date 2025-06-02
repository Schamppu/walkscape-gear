<script setup>
import { ref, onMounted } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import TabContentWrapper from "../common/TabContentWrapper.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import { getSkills, getActivities } from "@/utils/axios/api_routes";
import Gear from "../gear/Gear.vue";

const activityStore = useActivityStore();
const gearStore = useGearStore();

const skills = ref([]);
const isLoading = ref(true);

const activitiesBySkill = ref([]);

onMounted(async () => {
  const [skillsResponse, activitiesResponse] = await Promise.all([
    getSkills(),
    getActivities(),
  ]);

  const { data: skillList } = skillsResponse;
  skills.value = skillList.map(({ name, id, icon }) => ({
    name,
    value: id,
    icon,
  }));

  const { data: activities } = activitiesResponse;

  const noneActivity = activities
    .filter(({ id }) => id === "activity-none")
    .map((item) => {
      return { ...item, value: item.name, items: [] };
    })[0];
  const categorized = skillList.map((skill) => {
    const { id, name: value } = skill;
    return {
      ...skill,
      value,
      items: activities
        .filter(({ relatedSkillsList }) => {
          return relatedSkillsList.length && relatedSkillsList[0] === id;
        })
        .map((item) => {
          return {
            ...item,
            value: item.name,
          };
        }),
    };
  });
  activitiesBySkill.value = [noneActivity, ...categorized];
  isLoading.value = false;
});

const selectActivity = (activity) => {
  activityStore.loadActivity(activity.id);
};
</script>

<template>
  <tab-content-wrapper>
    <div v-if="isLoading">
      <loading-throbber />
    </div>
    <div v-else class="tab-content">
      <nested-dropdown
        label="Activity"
        :data="activitiesBySkill"
        @select="selectActivity"
      />

      <details class="details">
        <summary>Gear Set</summary>
        <section class="gear">
          <div class="gear-options">
            <label>
              <input type="checkbox" v-model="gearStore.useOwned" />
              Show only owned items
            </label>
          </div>
          <gear />
        </section>
      </details>
      <!-- <div class="row">
        <div class="label-wrapper">
          <ws-label class="label" label="Skill" />
          <dropdown
            :options="skills"
            :selected-option="activityStore.skill"
            @change="handleSkillChange"
          />
        </div>
      </div> -->
      <!-- <div class="row">
        <div class="label-wrapper">
          <ws-label class="label" label="Activity" />
          <dropdown
            :options="activities"
            :selected-option="activityStore.activity"
            @change="handleActivityChange"
          />
        </div>
      </div> -->
      <!-- <activity-stat-panel v-if="activitySelected" /> -->
    </div>
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.tab-content {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  gap: $xlg;
}

.details {
  width: 100%;
  text-align: start;
}

.gear {
  gap: $sm;

  .gear-options {
    display: flex;
    gap: $sm;
    padding: $sm 0;
  }
}
</style>