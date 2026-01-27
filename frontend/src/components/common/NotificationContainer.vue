<script setup>
import { computed } from "vue";
import { useNotificationStore } from "@/store/notifications";

const notificationStore = useNotificationStore();

const notifications = computed(() => notificationStore.notifications);

function handleNotificationClick(id) {
  notificationStore.removeNotification(id);
}
</script>

<template>
  <teleport to="body">
    <div class="notification-container">
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
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  gap: $xs;

  @media (max-width: 768px) {
    left: 20px;
    right: 40px;
    bottom: calc($footerHeight + 20px);
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
