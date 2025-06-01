<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { usePlayerStore } from "@/store/player";
import { getOrCreateUserUuid } from "@/utils/user";
import Hub from "./components/hub/Hub.vue";
import Activity from "./components/activity/Activity.vue";
import Gear from "./components/gear/Gear.vue";
import Stats from "./components/Stats.vue";
import Footer from "./components/footer/Footer.vue";

const playerStore = usePlayerStore();
playerStore.setUuid(getOrCreateUserUuid());

// Reactive variables
const activeTab = ref("Hub");
const isMobile = ref(window.innerWidth <= 768);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const tabs = { Hub, Activity };
const activeTabComponent = computed(() => {
  return tabs[activeTab.value];
});

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<template>
  <!-- Mobile View: Tabs -->
  <div v-if="isMobile" class="mobile-layout">
    <!-- Dynamically render the selected component for the active tab -->
    <div class="mobile-content">
      <keep-alive>
        <component :is="activeTabComponent" />
      </keep-alive>
    </div>
    <Footer :tabs="tabs" @selectTab="activeTab = $event" />
  </div>

  <!-- Desktop View: Side-by-Side Layout -->
  <div v-else class="desktop-layout">
    <Hub />
    <Activity />
    <!-- <Gear />
    <Stats /> -->
  </div>
</template>

<style lang="scss">
@use "styles/app";

.mobile-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  width: 100%;
}

.mobile-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  overflow: hidden;

  padding: 20px;
}

.desktop-layout {
  display: flex;
  gap: 20px;
  min-height: 100dvh;
}
</style>
