<script setup>
import { ref, onMounted, onUnmounted, reactive, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { usePlayerStore } from "@/store/player";
import { useUrlStore } from "@/store/url";
import { useItemsStore } from "@/store/items";
import { useGearSetStore } from "@/store/gearSet";
import { useRouteStore } from "@/store/route";
import { useSettingsStore } from "@/store/settings";
import { provideSharedComposables } from "@/composables/context/provideSharedComposables";
import { getOrCreateUserUuid } from "@/utils/user";
import { icons } from "@/constants/iconPaths";
import Hub from "@/components/hub/HubTab.vue";
import Activity from "@/components/activity/ActivityTab.vue";
import Gear from "@/components/gear/GearTab.vue";
import Footer from "@/components/footer/FooterNav.vue";
import About from "@/components/about/AboutView.vue";
import PrivacyPolicy from "@/components/about/PrivacyPolicyView.vue";
import SiteNotice from "@/components/about/SiteNotice.vue";
import LoadingThrobber from "@/components/primitives/LoadingThrobber.vue";
import WsButton from "@/components/primitives/WsButton.vue";
import SettingsModal from "@/components/settings/SettingsModal.vue";
import NotificationContainer from "@/components/common/NotificationContainer.vue";
import UndoRedoButtons from "@/components/common/UndoRedoButtons.vue";

const urlStore = useUrlStore();
const settingsStore = useSettingsStore();
const { gearSettings } = storeToRefs(settingsStore);

// Create and provide shared composable instances once for the entire app.
// All descendant components can inject these instead of creating duplicates.
provideSharedComposables();

const isLoaded = ref(false);
const showSettings = ref(false);
const activeTab = ref("Hub");
const isMobile = ref(window.innerWidth <= 768);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const contentTabs = [
  { component: Hub, name: "Hub", icon: icons.character },
  { component: Gear, name: "Gear", icon: icons.gear2 },
  { component: Activity, name: "Activity", icon: icons.activity },
];
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
    return activeTab.value !== "About" && activeTab.value !== "PrivacyPolicy";
  }
}

const bootstrap = async () => {
  if (isLoaded.value) return;

  const activityStore = useActivityStore();
  const dataStore = useDataStore();
  const gearSetStore = useGearSetStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();
  const routeStore = useRouteStore();
  const settingsStore = useSettingsStore();

  playerStore.setUuid(getOrCreateUserUuid());

  await Promise.all([
    activityStore.fetchActivitiesData(),
    dataStore.fetchGameData(),
    playerStore.fetchPlayerData(),
    urlStore.fetchMapping(),
    itemsStore.fetchItems(),
    gearSetStore.fetchGearSets(),
    routeStore.fetchRouteData(),
    settingsStore.fetchSettingsData(),
  ]);

  // Initialize history tracking for stores
  await activityStore.initializeHistoryTracking();
  await gearSetStore.initializeHistoryTracking();

  await urlStore.decodeFromUrlAndApply();
  isLoaded.value = true;
};

function handleUuidUpdate(newUuid) {
  localStorage.setItem("userUuid", newUuid);

  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();

  playerStore.isLoaded = false;
  itemsStore.isLoaded = false;
  showSettings.value = false;
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
  <section class="app">
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
          Support
        </a>
      </div>
      <ws-button
        v-if="isLoaded"
        @click="showSettings = true"
        :icon-path="icons.settings"
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
        <About
          @back="scrollToTab('Hub')"
          @privacy-policy="scrollToTab('PrivacyPolicy')"
        />
      </div>

      <div
        v-show="activeTab === 'PrivacyPolicy'"
        :class="['tab-panel', { active: activeTab === 'PrivacyPolicy' }]"
        :tabindex="isMobile ? 0 : undefined"
      >
        <PrivacyPolicy @back="scrollToTab('About')" />
      </div>

      <div
        v-for="{ name, component } in contentTabs"
        :key="name"
        :ref="(el) => (tabRefs[name] = el)"
        :class="['tab-panel', { active: activeTab === name }]"
        :tabindex="isMobile ? 0 : undefined"
        v-show="shouldShowTab(name)"
      >
        <component :is="component" />
      </div>
      <Footer
        v-if="isMobile"
        :tabs="contentTabs"
        :active-tab="activeTab"
        @selectTab="scrollToTab"
      />
    </div>
    <SiteNotice />
    <SettingsModal v-model="showSettings" @update-uuid="handleUuidUpdate" />
    <NotificationContainer />

    <!-- Static Undo/Redo Buttons -->
    <div
      v-if="isLoaded && gearSettings.undoRedo.display === 2"
      class="static-undo-redo"
    >
      <undo-redo-buttons
        size="medium"
        variant="icon-only"
        direction="horizontal"
        :show-tooltips="true"
      />
    </div>
  </section>
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
  margin-bottom: 4rem;
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

.static-undo-redo {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;

  // Add a subtle background for better visibility
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  border-radius: $sm;
  padding: $xs;
  border: 1px solid rgba(255, 255, 255, 0.1);

  // Ensure it's above other elements but below modals
  z-index: 999;

  // On mobile, position above the footer
  @media (max-width: 768px) {
    bottom: calc($footerHeight + 20px);
  }
}
</style>
