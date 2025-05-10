<template>
  <div class="throbber-wrapper">
    <div class="spinner"></div>
  </div>
</template>

<script setup>
  // No props or logic needed for this simple version
</script>

<style lang="scss" scoped>
  .throbber-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
