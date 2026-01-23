<script setup>
import { onBeforeUnmount } from "vue";

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
});

const emit = defineEmits(["update:modelValue", "close"]);

const onEsc = (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    emit("update:modelValue", false);
    emit("close");
  }
};
window.addEventListener("keydown", onEsc);
// Clean up
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onEsc);
});

function close() {
  emit("update:modelValue", false);
  emit("close");
}
</script>

<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div
      class="modal-content"
      :style="{
        width: width,
        maxWidth: maxWidth,
        minWidth: minWidth,
        minHeight: minHeight,
        maxHeight: '80vh',
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
}

.modal-content {
  background: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  padding: $xxxlg;
  border-radius: $sm;
  position: relative;
  overflow-y: scroll;
}

.modal-header {
  position: relative;
  margin-bottom: $base;

  h2 {
    margin: 0;
    padding-right: $xlg; // Space for close button
  }
}

.close-btn {
  position: absolute;
  top: -$xs;
  right: -$xs;
  background: none;
  border: none;
  font-size: $xlg;
  cursor: pointer;
  color: $txPrimary;

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
</style>
