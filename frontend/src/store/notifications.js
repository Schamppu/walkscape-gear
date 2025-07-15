import { defineStore } from "pinia";

export const useNotificationStore = defineStore("notificationStore", {
  state: () => ({
    notifications: [],
    nextId: 1,
  }),
  actions: {
    addNotification(message, type = "success", duration = 3000) {
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

    success(message, duration = 3000) {
      return this.addNotification(message, "success", duration);
    },

    error(message, duration = 3000) {
      return this.addNotification(message, "error", duration);
    },
  },
});
