<script setup>
import { ref, onMounted } from "vue";
import { getItems } from "@/utils/axios/api_routes";
import WsIcon from "@/components/common/WsIcon.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";
import { getWikiUrl } from "@/utils/wiki";

onMounted(async () => {
  await getItems()
    .then(({ data }) => {
      items.value = data;
      isLoaded.value = true;
    })
    .catch((error) => {
      console.error("Error loading items:", error);
    });
});

const isLoaded = ref(false);
const items = ref([]);
const inputId = ref("");
const item = ref(null);
const error = ref("");

async function lookupItem() {
  error.value = "";
  item.value = null;
  if (!inputId.value) return;
  const foundItem = items.value.find(({ id }) => id === inputId.value);
  if (foundItem) {
    item.value = foundItem;
  } else {
    error.value = "Item not found.";
  }
}
</script>

<template>
  <loading-throbber v-if="!isLoaded" />
  <div v-else class="item-id-lookup">
    <h1>Walkscape Item Lookup</h1>
    <p>Use this tool to search for items in the game.</p>
    <input
      v-model="inputId"
      class="input-field"
      placeholder="Enter item ID"
      @keyup.enter="lookupItem"
    />
    <button class="button" @click="lookupItem">Lookup</button>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="item" class="item-result">
      <ws-icon :icon-path="item.icon" size="md" />
      <div>
        <p>
          {{ item.name }} (<a :href="getWikiUrl(item.name)" target="_blank"
            >wiki</a
          >)
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.item-id-lookup {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  gap: $md;
  padding: $lg;

  background-color: $boxPrimaryBackground;
  height: 100%;

  input {
    width: 320px;
  }
}

.button {
  cursor: pointer;
  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;
  padding: $xxxs;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
