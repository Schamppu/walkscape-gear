import { defineStore } from "pinia";

// Lazy import for history store to avoid circular dependencies
let useSettingsStore = null;
const getSettingsStore = async () => {
  if (!useSettingsStore) {
    try {
      const module = await import("@/store/settings");
      useSettingsStore = module.useSettingsStore;
    } catch {
      console.debug("Settings store not available");
      return null;
    }
  }
  return useSettingsStore?.();
};

export const useNotificationStore = defineStore("notificationStore", {
  state: () => ({
    notifications: [],
    nextId: 1,
  }),
  actions: {
    async addNotification(message, type = "success", duration = 3000) {
      const notification = {
        id: this.nextId++,
        message,
        type,
        duration,
        createdAt: Date.now(),
      };

      this.notifications.push(notification);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          this.removeNotification(notification.id);
        }, duration);
      }

      await new Promise(requestAnimationFrame);
      return notification.id;
    },

    removeNotification(id) {
      const index = this.notifications.findIndex((n) => n.id === id);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    },

    clearAll() {
      this.notifications = [];
    },

    async success(message, duration = 3000) {
      return this.addNotification(message, "success", duration);
    },

    async warning(message, duration = 3000) {
      return this.addNotification(message, "warning", duration);
    },

    async error(message, duration = 3000) {
      return this.addNotification(message, "error", duration);
    },

    async debug(message, data = [], duration = 3000) {
      const settingsStore = await getSettingsStore();

      if (settingsStore && settingsStore.toolSettings.enableDebug.value) {
        console.debug(message, data);
        return this.addNotification(message, "warning", duration);
      }
    },
  },
});
