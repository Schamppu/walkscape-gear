<script setup>
defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: "",
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  width: {
    type: String,
    default: "80%",
  },
  maxWidth: {
    type: String,
    default: "500px",
  },
  minWidth: {
    type: String,
    default: "300px",
  },
  minHeight: {
    type: String,
    default: "200px",
  },
  height: {
    type: String,
    default: "",
  },
  bottomSheet: {
    type: Boolean,
    default: false,
  },
  noPadding: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

function close() {
  emit("update:modelValue", false);
  emit("close");
}
</script>

<template>
  <div
    v-if="modelValue"
    class="modal-backdrop"
    :class="{ 'bottom-sheet': bottomSheet }"
  >
    <transition :name="bottomSheet ? 'slide-up' : ''" :appear="bottomSheet">
      <div
        v-click-outside="{ handler: close, esc: true }"
        class="modal-content"
        :class="{ 'bottom-sheet': bottomSheet, 'no-padding': noPadding }"
        :style="{
          width: width,
          maxWidth: maxWidth,
          minWidth: minWidth || undefined,
          minHeight: minHeight || undefined,
          maxHeight: bottomSheet ? undefined : '80vh',
          height: height || undefined,
        }"
      >
        <div
          v-if="title || showCloseButton || $slots.header"
          class="modal-header"
        >
          <slot name="header">
            <h2 v-if="title">{{ title }}</h2>
          </slot>
          <button v-if="showCloseButton" class="close-btn" @click="close">
            ✕
          </button>
        </div>

        <div class="modal-body">
          <slot />
        </div>

        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(6, 12, 15, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;

  &.bottom-sheet {
    align-items: flex-end;
  }
}

.modal-content {
  background: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  padding: $xxxlg;
  border-radius: $sm;
  position: relative;
  overflow-y: auto;

  &.no-padding {
    padding: 0;
  }

  &.bottom-sheet {
    border-radius: 0;
    border-top-left-radius: $base;
    border-top-right-radius: $base;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.modal-content.bottom-sheet {
  .modal-header {
    background-color: $boxDarkBackground;
    border-bottom: 1px solid $boxDarkOutline;
    border-radius: calc($sm - 2px) calc($sm - 2px) 0 0;
    margin-bottom: $xxxs;
  }

  .modal-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: $base;

  h2 {
    flex: 1;
    margin: 0;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: $xlg;
  cursor: pointer;
  color: $txPrimary;
  flex-shrink: 0;
  margin-left: auto;

  &:hover {
    opacity: 0.7;
  }
}

.modal-body {
  flex: 1;
}

.modal-footer {
  margin-top: $base;
  padding-top: $base;
  border-top: 1px solid $boxDarkOutline;
}

/* Slide-up transition for bottom-sheet variant */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
