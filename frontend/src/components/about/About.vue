<script setup>
defineEmits(["back"]);
</script>

<template>
  <div class="about-page">
    <div class="back-btn-wrapper">
      <button @click="$emit('back')" class="back-btn">← Back to App</button>
    </div>

    <h2>About</h2>
    <p>This is the about page for Walkscape Gear Tool.</p>
    <!-- Add more info here -->
  </div>
</template>

<style scoped lang="scss">
.about-page {
  display: flex;
  flex-direction: column;

  padding: $xlg;
}

.back-btn-wrapper {
  align-self: flex-start;
  margin-bottom: $xlg;

  .back-btn {
    cursor: pointer;

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
</style>
