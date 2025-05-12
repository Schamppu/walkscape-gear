<script setup>
import { ref } from "vue";
import WsIcon from "@/components/common/WsIcon.vue";
import SkillBubble from "@/components/common/SkillBubble.vue";
import { getKeyword } from "@/utils/axios/routes.js";

const props = defineProps({
  activityInfo: {
    type: Object,
    required: true,
  },
});

const mappedKeywords = ref([]);

const { levelRequirementsMap, xpRewardsMap, workRequired, requiredKeywords } =
  props.activityInfo;

const fetchKeywords = async (keywords) => {
  try {
    const responses = await Promise.all(
      keywords.map(async (item) => {
        const { data } = await getKeyword({ id: item["keyword"]});
        return data.requirementText;
      })
    );
    mappedKeywords.value = responses;
  } catch (error) {
    console.error("Error fetching keywords:", error);
  }
};

fetchKeywords(requiredKeywords);

console.log(props.activityInfo);
</script>

<template>
  <div class="info-card-wrapper">
    <ws-icon :iconPath="activityInfo['activityIcon']" size="md" />
    <div class="text-area">
      <div class="row">
        <h3>{{ activityInfo["name"] }}</h3>
        <div class="skill-bubbles" v-if="levelRequirementsMap">
          <skill-bubble
            v-for="(level, skill) in levelRequirementsMap"
            :key="skill"
            :skill="skill"
            :text="level.toString()"
          />
        </div>
      </div>
      <div class="row" v-if="mappedKeywords.length">
        <ul class="keyword-list">
          <li v-for="keyword in mappedKeywords" :key="keyword">
            {{ keyword }}
          </li>
        </ul>
      </div>
      <div class="row">
        <div class="skill-bubbles" v-if="xpRewardsMap">
          <skill-bubble skill="steps" :text="`${workRequired}`" />
          <skill-bubble
            v-for="(xp, skill) in xpRewardsMap"
            :key="skill"
            :skill="skill"
            :text="`+${xp}`"
            :use-color-border="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.info-card-wrapper {
  display: flex;
  align-items: center;
  gap: variables.$lg;

  width: 100%;
}

.text-area {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: variables.$md;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.skill-bubbles {
  display: flex;
  gap: variables.$sm;
}

.keyword-list {
  padding-left: variables.$lg;
  text-align: start;
}
</style>