<script setup>
import { ref, onMounted, onUnmounted, reactive, nextTick } from "vue";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { usePlayerStore } from "@/store/player";
import { useUrlStore } from "@/store/url";
import { useItemsStore } from "@/store/items";
import { getOrCreateUserUuid } from "@/utils/user";
import Hub from "./components/hub/HubTab.vue";
import Activity from "./components/activity/ActivityTab.vue";
import Gear from "./components/gear/GearTab.vue";
import Footer from "./components/footer/FooterNav.vue";
import About from "./components/about/AboutView.vue";
import LoadingThrobber from "./components/common/LoadingThrobber.vue";
import WsButton from "./components/common/WsButton.vue";
import SettingsModal from "./components/common/SettingsModal.vue";

const urlStore = useUrlStore();
const isLoaded = ref(false);
const showSettings = ref(false);
const activeTab = ref("Hub");
const isMobile = ref(window.innerWidth <= 768);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const contentTabs = { Hub, Gear, Activity };
const tabs = { About, ...contentTabs };
const tabRefs = reactive({});

function scrollToTab(tabName) {
  activeTab.value = tabName;
  nextTick(() => {
    const el = tabRefs[tabName];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy({ top: -40, left: 0, behavior: "instant" });
    }
  });
}

function shouldShowTab(tabName) {
  if (isMobile.value) {
    return activeTab.value === tabName;
  } else {
    return activeTab.value !== "About";
  }
}

const bootstrap = async () => {
  if (isLoaded.value) return;

  const activityStore = useActivityStore();
  const dataStore = useDataStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();

  playerStore.setUuid(getOrCreateUserUuid());

  await Promise.all([
    activityStore.fetchActivitiesData(),
    dataStore.fetchGameData(),
    playerStore.fetchPlayerData(),
    urlStore.fetchMapping(),
    itemsStore.fetchItems(),
  ]);

  await urlStore.decodeFromUrlAndApply();
  isLoaded.value = true;
};

function handleUuidUpdate(newUuid) {
  localStorage.setItem("userUuid", newUuid);

  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();

  playerStore.isLoaded = false;
  itemsStore.isLoaded = false;
  isLoaded.value = false;

  bootstrap();
}

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
  <header class="main-header">
    <div class="header-group">
      <a
        href="#"
        @click.prevent="scrollToTab('About')"
        :ref="(el) => (tabRefs['About'] = el)"
        :class="{ active: activeTab === 'About' }"
        >About</a
      >
      <a
        href="https://buymeacoffee.com/juhanaauttg"
        target="_blank"
        rel="noopener noreferrer"
      >
        BMaC
      </a>
    </div>
    <ws-button
      v-if="isLoaded"
      @click="showSettings = true"
      icon-path="assets/icons/text/general_icons/settings.png"
      icon-size="sm"
    />
  </header>
  <loading-throbber v-if="!isLoaded" class="throbber" />
  <div v-else :class="isMobile ? 'mobile-layout' : 'desktop-layout'">
    <div
      v-show="activeTab === 'About'"
      :class="['tab-panel', { active: activeTab === 'About' }]"
      :tabindex="isMobile ? 0 : undefined"
    >
      <About @back="scrollToTab('Hub')" />
    </div>

    <div
      v-for="tabName in Object.keys(contentTabs)"
      :key="tabName"
      :ref="(el) => (tabRefs[tabName] = el)"
      :class="['tab-panel', { active: activeTab === tabName }]"
      :tabindex="isMobile ? 0 : undefined"
      v-show="shouldShowTab(tabName)"
    >
      <component :is="tabs[tabName]" />
    </div>
    <Footer
      v-if="isMobile"
      :tabs="contentTabs"
      :active-tab="activeTab"
      @selectTab="scrollToTab"
    />
  </div>
  <SettingsModal v-model="showSettings" @update-uuid="handleUuidUpdate" />
</template>

<style lang="scss">
@use "styles/app";

.throbber {
  padding-top: 64px !important;
}

.mobile-layout {
  display: flex;
  flex-direction: column;
  min-height: calc(100svh - $footerHeight - $navHeight);
  width: 100%;
  overflow-x: hidden;
  padding-bottom: $footerHeight;
  padding-top: $navHeight;
}

.desktop-layout {
  display: flex;
  flex-direction: row;
  gap: 20px;
  min-height: 100dvh;
  padding-top: $navHeight;
}

.tab-panel {
  width: 100%;
  transition: opacity 0.2s;
}

.mobile-layout .tab-panel {
  display: none;
  min-height: calc(100svh - $footerHeight - $navHeight);
}
.mobile-layout .tab-panel.active {
  display: block;
}

.desktop-layout .tab-panel {
  display: block;
  flex: 1 1 0;
}

.main-header {
  width: 100%;
  height: $navHeight;
  box-sizing: border-box;
  z-index: 2000;
  background: $bgPrimary;
  color: $txPrimary;

  position: fixed;
  left: 0;
  top: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: $xxxxs $md;
  border-bottom: 1px solid $boxPrimaryOutline;

  .header-group {
    display: flex;
    align-items: center;
    gap: $xlg;
  }

  a {
    color: $txPrimary;
    text-decoration: none;
    opacity: 0.8;
    padding: $xxxxs $xxs;
    &.active {
      opacity: 1;
      font-weight: bold;
      border-bottom: 2px solid $txPrimary;
    }
    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }
}
</style>
