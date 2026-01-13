<script setup>
import { ref, computed, onMounted } from "vue";
import { petQualityOptions } from "@/constants/quality";
import { useItemsStore } from "@/store/items";
import WsIcon from "@/components/common/WsIcon.vue";
import StatsDisplay from "../common/StatsDisplay.vue";
import AbilitiesDisplay from "../common/abilities/AbilitiesDisplay.vue";
import useBaseContext from "@/composables/useBaseContext";
import RequirementDisplay from "../activity/Info/RequirementDisplay.vue";
import { getPetIcon } from "@/utils/pets";

const props = defineProps({
  pet: Object,
  selected: Boolean,
});

const emit = defineEmits(["change"]);
const [normal, rare] = petQualityOptions.map((q) => q.value);
const levelOptions = [{ stage: "egg", level: 0 }, ...props.pet.levels];
const ctx = useBaseContext();

const itemsStore = useItemsStore();

const isOwned = ref(false);
const isOpen = ref(false);
const isHidden = ref(false);
const isEmbargo = ref(false);
const rarity = ref("");
const level = ref(0);

onMounted(() => {
  const entry = itemsStore.ownedItems[props.pet.id];
  isEmbargo.value = ctx.embargoedItems.value.has(props.pet.id);

  if (!entry) {
    isOwned.value = false;
    isHidden.value = false;
    level.value = 0;
    rarity.value = normal;
  } else {
    isOwned.value = entry.owned;
    isHidden.value = entry.hidden;
    level.value = entry.quality ? Number(entry.quality) : 0;
    rarity.value = entry.quality2 ?? normal;
  }
});

function emitChange(overrides = {}) {
  emit("change", {
    itemId: props.pet.id,
    owned: isOwned.value,
    hidden: isHidden.value,
    quality: `${level.value}`,
    quality2: rarity.value,
    ...overrides,
  });
}

const toggleHidden = (e) => {
  e.stopPropagation();
  isHidden.value = !isHidden.value;
  emitChange({ hidden: isHidden.value });
};

const updateRarity = () => {
  isOwned.value = true;
  emitChange({ owned: isOwned.value });
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const hideEmbargo = computed(() => {
  return isEmbargo.value && !isOwned.value;
});

const toggleChecked = (e) => {
  e.stopPropagation();
  if (!hideEmbargo.value) {
    isOwned.value = !isOwned.value;
    emitChange({ owned: isOwned.value });
  }
};

const icon = computed(() => {
  return getPetIcon(props.pet, level.value, rarity.value === rare);
});

const abilities = computed(() => {
  return props.pet.abilities
    .filter(({ unlockLevel }) => unlockLevel <= level.value)
    .map(({ ability }) => ability);
});
</script>

<template>
  <section class="item">
    <section :class="['item-entry', `pet-color-${rarity.value}`]">
      <div class="group" @click="toggleChecked">
        <input
          type="checkbox"
          :checked="isOwned"
          :disabled="hideEmbargo"
          readonly
        />
        <ws-icon
          :iconPath="hideEmbargo ? '' : icon"
          :key="hideEmbargo ? '' : icon"
        />

        <div class="rows">
          <span :class="`color-${rarity.value}`">{{
            hideEmbargo ? "Unknown" : pet.name
          }}</span>
          <div class="selections">
            <select
              v-model="rarity"
              class="rarity-input"
              @click.stop
              @change="updateRarity"
            >
              <option
                v-for="r in petQualityOptions"
                :key="`rarity-${r.value}`"
                :value="r.value"
                :class="`pet-color-${r.value}`"
              >
                {{ r.name }}
              </option>
            </select>
            <select
              v-model="level"
              class="level-input"
              @click.stop
              @change="updateRarity"
            >
              <option
                v-for="l in levelOptions"
                :key="`rarity-${l.level}`"
                :value="l.level"
              >
                Level {{ l.level }}: {{ l.stage }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <button v-if="level > 0" class="toggle" @click="toggleOpen">
        {{ isOpen ? "▲" : "▼" }}
      </button>
    </section>

    <section v-if="level > 0 && isOpen">
      <label class="toggle">
        <input
          @click="toggleHidden"
          type="checkbox"
          v-model="isHidden"
          aria-label="Toggle visibility"
        />
        Hide
      </label>
      <stats-display
        :item="props.pet"
        :quality="`${level}`"
        :hide-keywords="true"
      />
      <div class="xp">
        <label>xp requirement</label>
        <requirement-display
          v-for="(requirement, idx) in props.pet.xpRequirements"
          :key="`xp-requirement-${idx}`"
          :requirement="requirement"
        />
      </div>
      <abilities-display v-if="abilities.length" :abilities="abilities" />
    </section>
  </section>
</template>

<style lang="scss" scoped>
.item-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;

  background-color: $boxDarkBackground;
  border-radius: $sm;
  border: 1px solid $bgPrimary;
  gap: $xxs;

  padding: $xxxs $xxs;

  .rows {
    display: flex;
    flex-direction: column;
    gap: $xxxs;
  }

  .group {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: $xxs;
    flex-grow: 1;
  }

  .selections {
    display: flex;
    gap: $xxs;
  }
}

.toggle {
  cursor: pointer;
  padding: 0 $xs;
  color: $txPrimary !important;
  background: none;
  border: none;
  font: inherit;
}

.xp {
  margin-top: $xxs;
}
</style>
