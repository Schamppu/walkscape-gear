<script setup>
import { ref } from "vue";
import WsText from "@/components/common/text/WsText.vue";
import WsIcon from "../WsIcon.vue";
import RequirementDisplay from "@/components/activity/Info/RequirementDisplay.vue";
import { icons } from "@/constants/iconPaths";

const props = defineProps({
  ability: Object,
});

const isOpen = ref(false);
const requirementsOpen = ref(false);
const cooldownOpen = ref(false);

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const toggleOpenRequirements = () => {
  requirementsOpen.value = !requirementsOpen.value;
};

const toggleOpenCooldown = () => {
  cooldownOpen.value = !cooldownOpen.value;
};
</script>

<template>
  <section class="ability">
    <div class="basic-info">
      <ws-icon :icon-path="props.ability?.icon" size="mdp" />
      <div class="data">
        <div class="title">
          <ws-icon :icon-path="icons[props.ability?.type]" size="xs" />
          <p :class="['type', `color-${props.ability.type}`]">
            {{ props.ability.type }}
          </p>
        </div>
        <p :class="['name', `color-${props.ability.type}`]">
          {{ props.ability.name }}
        </p>
      </div>
      <button class="toggle" @click="toggleOpen">
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </div>
    <section v-if="isOpen" class="extra-info">
      <ws-text :text="props.ability.desc" :data="props.ability.data" />
      <div v-if="props.ability.requirements.length" class="requirements">
        <div class="openable">
          <p class="info-title">requirements</p>
          <button class="toggle" @click="toggleOpenRequirements">
            {{ requirementsOpen ? "▲" : "▼" }}
          </button>
        </div>
        <div v-if="requirementsOpen">
          <div
            v-for="requirement in props.ability.requirements"
            :key="requirement"
            class="opened"
          >
            <requirement-display :requirement="requirement" />
          </div>
        </div>
      </div>
      <div v-if="props.ability.cooldown" class="cooldown">
        <div :class="['openable']" @click="toggleOpenCooldown">
          <p class="info-title">cooldown</p>
          <div v-if="props.ability.cooldown.steps" class="amount">
            <p>{{ props.ability.cooldown.steps }}</p>
            <ws-icon :icon-path="icons.steps" size="sm" />
          </div>
          <div v-else-if="props.ability.cooldown.actions" class="amount">
            <p>{{ props.ability.cooldown.actions }}</p>
            <ws-icon :icon-path="icons.actions" size="sm" />
          </div>
          <div v-else class="amount">
            <p v-if="props.ability.cooldown.days">
              {{ props.ability.cooldown.days }}d
            </p>
            <p v-if="props.ability.cooldown.hours">
              {{ props.ability.cooldown.hours }}h
            </p>
            <p v-if="props.ability.cooldown.minutes">
              {{ props.ability.cooldown.minutes }}min
            </p>
            <p v-if="props.ability.cooldown.seconds">
              {{ props.ability.cooldown.seconds }}s
            </p>
            <ws-icon :icon-path="icons.cooldowns" size="sm" />
          </div>
        </div>
        <div v-if="cooldownOpen">
          <div
            v-for="requirement in props.ability.cooldown.requirements"
            :key="requirement"
            class="opened"
          >
            <requirement-display :requirement="requirement" />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style lang="scss" scoped>
.ability {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-radius: $xxxs;
  color: $txLighter;
  background-color: $boxDarkBackground;
}

.basic-info {
  display: flex;
  gap: $sm;
  padding: $xxxxs $xs;

  .data {
    display: flex;
    flex-direction: column;
  }

  .title {
    display: flex;
    gap: $xxs;
    padding: $xxxxs 0;
    align-items: center;
  }

  .type {
    text-transform: uppercase;
    line-height: 16px;
    font-size: 12px;
  }
}

.extra-info {
  display: flex;
  flex-direction: column;
  border: 3px solid $boxDarkOutline;
  border-radius: 0 0 $xxxs $xxxs;
  border-top: none;

  .requirements,
  .cooldown {
    display: flex;
    flex-direction: column;
    margin: $xxxxs $xxxs;
    padding: $xs;
    background-color: $bgPrimary;
    color: $txPrimary;

    p {
      line-height: 16px;
      font-size: 12px;
    }

    .info-title {
      text-transform: uppercase;
    }

    .amount {
      display: flex;
      align-items: center;
      gap: $xxxxs;
      text-transform: none;
      margin-right: $sm;
    }
  }

  .cooldown {
    font: inherit;
    cursor: pointer;
  }

  .openable {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .opened {
    margin-top: $xxxs;
  }
}

.toggle {
  font: inherit;
  cursor: pointer;

  margin-left: auto;
  padding: 0 $xs;
  color: $txPrimary !important;
  background: none;
  border: none;
}
</style>
