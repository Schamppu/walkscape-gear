<script setup></script>

<template>
  <details open>
    <summary>Travel Info</summary>

    <section :class="['travel-info', 'border-agility']">
      <p>This is still being developed.</p>
    </section>
  </details>
</template>

<style lang="scss" scoped>
.travel-info {
  border-radius: $md;
  display: flex;

  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  gap: $lg;

  padding: $md;
}
</style>
