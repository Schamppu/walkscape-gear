import { defineStore } from "pinia";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = "success" | "warning" | "error";

export type Notification = {
  id: number;
  message: string;
  type: NotificationType;
  duration: number;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Lazy settings store (avoids circular runtime dependency)
// ---------------------------------------------------------------------------

// Type-only import is erased at runtime, so there is no circular reference.
import type { useSettingsStore as UseSettingsStore } from "@/store/settings";
type SettingsStore = ReturnType<typeof UseSettingsStore>;

let _useSettingsStore: (() => SettingsStore) | null = null;

const getSettingsStore = async (): Promise<SettingsStore | null> => {
  if (!_useSettingsStore) {
    try {
      const module = await import("@/store/settings");
      _useSettingsStore = module.useSettingsStore as () => SettingsStore;
    } catch {
      console.debug("Settings store not available");
      return null;
    }
  }
  return _useSettingsStore?.() ?? null;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = defineStore("notificationStore", {
  state: () => ({
    notifications: [] as Notification[],
    nextId: 1,
  }),
  actions: {
    async addNotification(
      message: string,
      type: NotificationType = "success",
      duration = 3000,
    ): Promise<number> {
      const notification: Notification = {
        id: this.nextId++,
        message,
        type,
        duration,
        createdAt: Date.now(),
      };

      this.notifications.push(notification);

      if (duration > 0) {
        setTimeout(() => {
          this.removeNotification(notification.id);
        }, duration);
      }

      await new Promise(requestAnimationFrame);
      return notification.id;
    },

    removeNotification(id: number): void {
      const index = this.notifications.findIndex((n) => n.id === id);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    },

    clearAll(): void {
      this.notifications = [];
    },

    async success(message: string, duration = 3000): Promise<number> {
      return this.addNotification(message, "success", duration);
    },

    async warning(message: string, duration = 3000): Promise<number> {
      return this.addNotification(message, "warning", duration);
    },

    async error(message: string, duration = 3000): Promise<number> {
      return this.addNotification(message, "error", duration);
    },

    async debug(
      message: string,
      data: unknown[] = [],
      duration = 3000,
    ): Promise<number | undefined> {
      const settingsStore = await getSettingsStore();
      if (!settingsStore) return;

      // Derive the per-category settings key from the "Category: …" message prefix.
      // e.g. "GearSet: loaded 3 sets" → looks up toolSettings["debugGearSet"]
      const colonIdx = message.indexOf(":");
      const prefix = colonIdx > 0 ? message.slice(0, colonIdx) : null;
      const settingKey = prefix ? `debug${prefix}` : null;

      const isEnabled =
        settingKey !== null &&
        settingsStore.toolSettings[settingKey]?.value === true;

      if (isEnabled) {
        console.debug(message, data);
        return this.addNotification(message, "warning", duration);
      }
    },
  },
});
