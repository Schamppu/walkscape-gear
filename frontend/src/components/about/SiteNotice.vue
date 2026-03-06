<script setup lang="ts">
import { ref } from "vue";

const showNotice = ref(false);
localStorage.removeItem("hideNotice");
// const noticeHidden = localStorage.getItem("hideNotice");
// showNotice.value = !noticeHidden;

function hideNotice() {
  showNotice.value = false;
  localStorage.setItem("hideNotice", "true");
}
</script>

<template>
  <div v-if="showNotice" class="notice">
    <div></div>
    <p>Wiki Embargo in place. New items hidden unless imported from in-game.</p>
    <button class="close-button" @click="hideNotice" type="button">✕</button>
  </div>
</template>

<style lang="scss" scoped>
.notice {
  position: fixed;
  left: 0;
  top: $navHeight;
  height: $navHeight;
  width: 100%;

  box-sizing: border-box;
  z-index: 2000;
  background: $txNegativeDark;
  color: $txPrimary;
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: $xxxxs $md;
  border-bottom: 1px solid $boxPrimaryOutline;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: $base;
  width: $xxlg;
  height: $xxlg;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $xxs;
  border: 1px solid $boxDarkOutline;

  &:hover {
    color: $txPrimary;
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
