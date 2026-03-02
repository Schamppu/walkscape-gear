<script setup lang="ts">
import { computed } from "vue";
import { useNotificationStore } from "@/store/notifications";
import { useSettingsStore } from "@/store/settings";

/**
 * NotificationContainer.vue
 * A component that displays notifications using a teleport to the body element.
 * Notifications are displayed in a stack at the bottom right of the screen (or bottom left on mobile).
 * Each notification can be clicked to remove it from the stack.
 *
 * The component uses a transition group for smooth animations when notifications are added or removed.
 * The notification store is accessed to retrieve the current notifications and to remove them when clicked.
 * The styles are scoped to ensure they do not affect other parts of the application, and media queries are used for responsive design.
 *
 * Does NOT:
 * - Handle the logic for adding notifications (this is done in the notification store).
 * - Display different content based on notification type (all notifications display the message, but have different border colors).
 * - Automatically remove notifications after a certain time (this should be handled in the notification store).
 */

const notificationStore = useNotificationStore();
const settingsStore = useSettingsStore();

const notifications = computed(() => notificationStore.notifications);

/**
 * When the static undo/redo buttons are pinned to the bottom-right corner
 * (undoRedo.display === 2), shift the notification container up so it doesn't
 * overlap them. The offset matches the approximate height of that container.
 */
const containerStyle = computed(() => ({
  "--undo-redo-offset":
    settingsStore.gearSettings?.undoRedo?.display === 2 ? "5rem" : "0px",
}));

function handleNotificationClick(id: number): void {
  notificationStore.removeNotification(id);
}
</script>

<template>
  <teleport to="body">
    <div class="notification-container" :style="containerStyle">
      <transition-group name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification', `notification-${notification.type}`]"
          @click="handleNotificationClick(notification.id)"
        >
          {{ notification.message }}
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.notification-container {
  --undo-redo-offset: 0px;

  position: fixed;
  bottom: calc(20px + var(--undo-redo-offset));
  right: 20px;
  z-index: 9999;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  gap: $xs;

  @media (max-width: 768px) {
    left: 20px;
    right: 40px;
    bottom: calc($footerHeight + 20px + var(--undo-redo-offset));
  }
}

.notification {
  background: $boxDarkBackground;
  color: $txPrimary;
  padding: $xs $sm;
  border-radius: $sm;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;

  max-width: 350px;
  word-wrap: break-word;

  @media (max-width: 768px) {
    max-width: none;
    width: 100%;
  }

  &-success {
    border: 2px solid $txPositive;
  }

  &-warning {
    border: 2px solid $txWarning;
  }

  &-error {
    border: 2px solid $txNegative;
  }

  &:hover {
    opacity: 0.9;
  }
}

// Transition animations
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);

  @media (max-width: 768px) {
    transform: translateY(100%);
  }
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);

  @media (max-width: 768px) {
    transform: translateY(100%);
  }
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
