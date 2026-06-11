<script setup>
import { ref, computed, reactive, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useGearStore } from "@/store/gear";
import IconInputBubble from "@/components/common/IconInputBubble.vue";
import {
  injectSkillModifiers,
  injectFineMaterials,
} from "@/composables/context/injectShared";
import WsIcon from "@/components/primitives/WsIcon.vue";
import WsLabel from "@/components/primitives/WsLabel.vue";
import CalculatorQualityOutcomeTable from "./CalculatorQualityOutcomeTable.vue";
import { skillLevelFromXp, xpToSkillLevel } from "@/domain/character";

const {
  stepsPerAction,
  xpPerStep,
  noMaterialsConsumed,
  doubleRewards,
  doubleAction,
} = injectSkillModifiers();
const { xpRewardsMultiplier } = injectFineMaterials();
const playerStore = usePlayerStore();
const itemsStore = useItemsStore();
const gearStore = useGearStore();

const activityStore = useActivityStore();
const { activity, recipe, activitySelected, recipeSelected } =
  storeToRefs(activityStore);
const source = computed(() =>
  activitySelected.value ? activity.value : recipe.value,
);

const { skillLevels } = storeToRefs(playerStore);
const skillList = computed(() =>
  activitySelected.value
    ? Object.keys(source.value.xpRewardsMap)
    : Object.keys(source.value.xpRewards),
);

// Consumable equipped in the active gear set. The section is only shown when
// the consumable carries a buff with a step-based duration.
const consumable = computed(() => gearStore.selectedGearset.consumable);
const consumableDurationSteps = computed(() => {
  const buff = consumable.value?.buffs?.find((b) => b.duration?.steps != null);
  return buff ? buff.duration.steps : null;
});
const showConsumable = computed(() => consumableDurationSteps.value != null);

// XP gained per step for a skill, scaled by the fine-materials multiplier.
const perStep = (skill) => {
  const entry = xpPerStep.value.find((o) => o.skill === skill);
  return (entry ? entry.value : 0) * xpRewardsMultiplier.value;
};

// Per-skill starting XP (the player's current XP). Independent of the anchor:
// these are the player's actual totals, seeded from the player store and
// overridable by the user.
const skillXpStartRefs = reactive({});
const startXp = (skill) => skillXpStartRefs[skill] ?? 0;

// ---------------------------------------------------------------------------
// Anchor model
//
// Every input field is a lens over a single conceptual amount of work. Rather
// than always anchoring on `steps`, we remember *which field the user last
// edited* and treat that as the source of truth. When a modifier or the
// selected activity/recipe changes, `steps` is recomputed from the anchored
// field, so the field you last touched stays put while the rest update around
// it.
// ---------------------------------------------------------------------------
const anchor = ref({ type: "steps", value: 0, skill: null });

const setAnchor = (type, value, skill = null) => {
  anchor.value = { type, value: Number(value) || 0, skill };
};
const isAnchor = (type, skill = null) =>
  anchor.value.type === type && anchor.value.skill === skill;

// Convert whatever is anchored back into the canonical `steps` amount.
const steps = computed(() => {
  const { type, value, skill } = anchor.value;
  const spa = stepsPerAction.value;
  switch (type) {
    case "steps":
      return value;
    case "actions":
      return value * spa;
    case "materials":
      return (value / (1 - noMaterialsConsumed.value)) * spa;
    case "crafts":
      return (value / (1 + doubleRewards.value)) * spa;
    case "gain": {
      const ps = perStep(skill);
      return ps ? value / ps : 0;
    }
    case "target": {
      const ps = perStep(skill);
      return ps ? Math.max(0, value - startXp(skill)) / ps : 0;
    }
    case "endlvl": {
      const ps = perStep(skill);
      const targetXp = xpToSkillLevel(value);
      return ps ? Math.max(0, targetXp - startXp(skill)) / ps : 0;
    }
    case "consumableSteps":
      return value * (1 + doubleAction.value);
    default:
      return 0;
  }
});

// Field accessors. The getter returns the raw anchored value when this field is
// the anchor (avoids round-trip rounding drift on the field you're editing),
// otherwise derives the value from `steps`.
const actionsFrom = () => steps.value / stepsPerAction.value;

const getSteps = () => (isAnchor("steps") ? anchor.value.value : steps.value);
const getActions = () =>
  isAnchor("actions") ? anchor.value.value : actionsFrom();
const getMaterials = () =>
  isAnchor("materials")
    ? anchor.value.value
    : actionsFrom() * (1 - noMaterialsConsumed.value);
const getCrafts = () =>
  isAnchor("crafts")
    ? anchor.value.value
    : actionsFrom() * (1 + doubleRewards.value);

const getGainedXp = (skill) =>
  isAnchor("gain", skill)
    ? anchor.value.value
    : steps.value * perStep(skill);
const getTargetXp = (skill) =>
  isAnchor("target", skill)
    ? anchor.value.value
    : startXp(skill) + getGainedXp(skill);
const getStartLvl = (skill) => skillLevelFromXp(startXp(skill));
const getEndLvl = (skill) =>
  isAnchor("endlvl", skill)
    ? anchor.value.value
    : skillLevelFromXp(getTargetXp(skill));

// Consumable steps = active steps scaled down by the double-action chance.
const getConsumableSteps = () =>
  isAnchor("consumableSteps")
    ? anchor.value.value
    : steps.value / (1 + doubleAction.value);
// Count is always derived: how many consumables the consumable-steps cover.
// Editing it sets a consumableSteps anchor (val * duration) so it never needs
// the duration to recover the underlying steps.
const getConsumableCount = () => {
  const d = consumableDurationSteps.value;
  return d ? Math.ceil(getConsumableSteps() / d) : 0;
};

const resultHasCO = computed(() => {
  if (recipeSelected.value) {
    const [itemId] = Object.keys(recipe.value.itemRewards);
    return (
      itemId in itemsStore.allGearItems &&
      itemsStore.allGearItems[itemId].type === "crafted"
    );
  }
  return false;
});

// Keep the per-skill starting XP map in sync with the active skill list:
// seed new skills from the player store, drop skills that disappear, and
// re-anchor to steps if the anchored skill is no longer present.
watchEffect(() => {
  const list = skillList.value;

  Object.keys(skillXpStartRefs).forEach((k) => {
    if (!list.includes(k)) delete skillXpStartRefs[k];
  });

  for (const s of list) {
    if (!(s in skillXpStartRefs)) {
      skillXpStartRefs[s] = xpToSkillLevel(skillLevels.value[s] ?? 1);
    }
  }

  if (anchor.value.skill && !list.includes(anchor.value.skill)) {
    anchor.value = { type: "steps", value: 0, skill: null };
  }
});

// When the consumable goes away while it's the anchor, re-anchor on steps so
// the anchor type reflects reality. A consumableSteps anchor converts to steps
// independently of the consumable, so this preserves the value (no reset).
watchEffect(() => {
  if (anchor.value.type === "consumableSteps" && !showConsumable.value) {
    anchor.value = { type: "steps", value: steps.value, skill: null };
  }
});
</script>

<template>
  <details open>
    <summary>Calculator</summary>
    <section class="calculator">
      <!-- Effort -->
      <div class="group">
        <p class="group-title"><ws-label label="effort" /></p>
        <div class="info-row">
          <icon-input-bubble
            label="steps"
            key="steps"
            id="steps"
            :max="1000000"
            :getValue="() => getSteps()"
            :setValue="() => {}"
            @input="(val) => setAnchor('steps', val)"
          />
          <icon-input-bubble
            label="actions"
            key="actions"
            id="actions"
            :max="1000000"
            :getValue="() => getActions()"
            :setValue="() => {}"
            @input="(val) => setAnchor('actions', val)"
          />
        </div>
      </div>

      <!-- Production (recipes only) -->
      <template v-if="recipeSelected">
        <hr class="divider" />
        <div class="group">
          <p class="group-title"><ws-label label="production" /></p>
          <div class="info-row">
            <icon-input-bubble
              label="materials"
              key="materials"
              id="materials"
              :max="1000000"
              :getValue="() => getMaterials()"
              :setValue="() => {}"
              @input="(val) => setAnchor('materials', val)"
            />
            <icon-input-bubble
              label="crafts"
              key="crafts"
              id="crafts"
              :max="1000000"
              :getValue="() => getCrafts()"
              :setValue="() => {}"
              @input="(val) => setAnchor('crafts', val)"
            />
          </div>
          <calculator-quality-outcome-table
            v-if="resultHasCO"
            :crafts="getCrafts()"
          />
        </div>
      </template>

      <!-- Consumable (only when the equipped consumable has a step duration) -->
      <template v-if="showConsumable">
        <hr class="divider" />
        <div class="group">
          <p class="group-title"><ws-label label="consumable" /></p>
          <div class="info-row">
            <icon-input-bubble
              label="steps"
              key="consumable-steps"
              id="consumable-steps"
              :max="99999999"
              :getValue="() => getConsumableSteps()"
              :setValue="() => {}"
              @input="(val) => setAnchor('consumableSteps', val)"
            />
            <icon-input-bubble
              label="count"
              key="consumable-count"
              id="consumable-count"
              :max="1000000"
              :getValue="() => getConsumableCount()"
              :setValue="() => {}"
              @input="
                (val) =>
                  setAnchor('consumableSteps', val * (consumableDurationSteps ?? 0))
              "
            />
          </div>
        </div>
      </template>

      <!-- Skills -->
      <hr class="divider" />
      <div class="group">
        <p class="group-title"><ws-label label="skills" /></p>
        <div
          :class="['skill-row', `border-${skill}`]"
          v-for="skill in skillList"
          :key="skill"
        >
          <p class="skill-title">
            <ws-icon
              :iconPath="`assets/icons/text/skill_icons/${skill}.png`"
              size="sm"
            />
            <ws-label :label="skill" />
          </p>
          <div class="info-row">
            <icon-input-bubble
              label="start xp"
              :key="`${skill}-start-xp`"
              :id="`${skill}-start-xp`"
              :max="99999999"
              :getValue="() => startXp(skill)"
              :setValue="() => {}"
              @input="(val) => (skillXpStartRefs[skill] = val)"
            />
            <icon-input-bubble
              label="gained xp"
              :key="`${skill}-xp`"
              :id="`${skill}-xp`"
              :max="99999999"
              :getValue="() => getGainedXp(skill)"
              :setValue="() => {}"
              @input="(val) => setAnchor('gain', val, skill)"
            />
            <icon-input-bubble
              label="target xp"
              :key="`${skill}-target-xp`"
              :id="`${skill}-target-xp`"
              :max="99999999"
              :getValue="() => getTargetXp(skill)"
              :setValue="() => {}"
              @input="(val) => setAnchor('target', val, skill)"
            />
            <icon-input-bubble
              label="start lvl"
              :key="`${skill}-start-lvl`"
              :id="`${skill}-start-lvl`"
              :max="99"
              :getValue="() => getStartLvl(skill)"
              :setValue="() => {}"
              @input="(val) => (skillXpStartRefs[skill] = xpToSkillLevel(val))"
            />
            <icon-input-bubble
              label="end lvl"
              :key="`${skill}-end-lvl`"
              :id="`${skill}-end-lvl`"
              :max="99"
              :getValue="() => getEndLvl(skill)"
              :setValue="() => {}"
              @input="(val) => setAnchor('endlvl', val, skill)"
            />
          </div>
        </div>
      </div>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.calculator {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: stretch;
  gap: $md;

  padding: $md;

  .divider {
    width: 100%;
    border: none;
    border-top: 1px solid $chipOutline;
    margin: 0;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: $sm;
    align-items: flex-start;
  }

  .group-title {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
    font-size: 0.85em;
  }

  .skill-title {
    display: flex;
    gap: $xxs;
    align-items: center;
  }

  .skill-row {
    display: flex;
    flex-direction: column;
    gap: $sm;
    align-items: start;
    padding: $md;
    border-radius: $md;
  }

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: $md;
  }
}
</style>
