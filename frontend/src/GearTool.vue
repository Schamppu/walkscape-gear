<script setup>
import { ref, onMounted, onUnmounted, reactive, nextTick } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useUrlStore } from "@/store/url";
import { useItemsStore } from "@/store/items";
import { getOrCreateUserUuid } from "@/utils/user";
import Hub from "./components/hub/Hub.vue";
import Activity from "./components/activity/Activity.vue";
import Gear from "./components/gear/Gear.vue";
import Footer from "./components/footer/Footer.vue";
import LoadingThrobber from "./components/common/LoadingThrobber.vue";

const urlStore = useUrlStore();
const isLoaded = ref(false);
const activeTab = ref("Hub");
const isMobile = ref(window.innerWidth <= 768);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const tabs = { Hub, Gear, Activity };

// Refs for each tab panel
const tabRefs = reactive({});

function scrollToTab(tabName) {
  activeTab.value = tabName;
  nextTick(() => {
    const el = tabRefs[tabName];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
}

const bootstrap = async () => {
  if (isLoaded.value) return;
  
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();

  playerStore.setUuid(getOrCreateUserUuid());

  await Promise.all([
    activityStore.fetchActivitiesData(),
    playerStore.fetchPlayerData(),
    urlStore.fetchMapping(),
    itemsStore.fetchItems(),
  ]);

  await urlStore.decodeFromUrlAndApply();
  isLoaded.value = true;
};

onMounted(async () => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);

  await bootstrap();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<template>
  <loading-throbber v-if="!isLoaded" />
  <div v-else :class="isMobile ? 'mobile-layout' : 'desktop-layout'">
    <div
      v-for="tabName in Object.keys(tabs)"
      :key="tabName"
      :ref="(el) => (tabRefs[tabName] = el)"
      :class="['tab-panel', { active: activeTab === tabName }]"
      :tabindex="isMobile ? 0 : undefined"
    >
      <component :is="tabs[tabName]" />
    </div>
    <Footer
      v-if="isMobile"
      :tabs="tabs"
      :active-tab="activeTab"
      @selectTab="scrollToTab"
    />
  </div>
</template>

<style lang="scss">
@use "styles/app";

.mobile-layout {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 64px);
  width: 100%;
  overflow-x: hidden;
  padding-bottom: 64px;
}

.desktop-layout {
  display: flex;
  flex-direction: row;
  gap: 20px;
  min-height: 100dvh;
}

.tab-panel {
  width: 100%;
  transition: opacity 0.2s;
}

.mobile-layout .tab-panel {
  display: none;
  min-height: calc(100dvh - 64px);
}
.mobile-layout .tab-panel.active {
  display: block;
}

.desktop-layout .tab-panel {
  display: block;
  flex: 1 1 0;
}
</style>
