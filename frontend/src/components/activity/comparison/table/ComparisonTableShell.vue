<script setup>
import TableHead from "./TableHead.vue";

defineProps({
  title: String,
  wrapped: { type: Boolean, default: false },
  borderClass: String,
});
</script>

<template>
  <details open>
    <summary>{{ title }}</summary>

    <div v-if="wrapped" :class="['comparison-table-wrapper', borderClass]">
      <table class="comparison-table">
        <TableHead />
        <tbody>
          <slot />
        </tbody>
      </table>
    </div>

    <table v-else class="comparison-table">
      <TableHead />
      <tbody>
        <slot />
      </tbody>
    </table>
  </details>
</template>

<style lang="scss">
.comparison-table-wrapper {
  border-radius: $sm;
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  thead tr {
    th {
      background: $boxPrimaryBackground;
    }

    th:first-child {
      border-top-left-radius: $sm;
    }

    th:last-child {
      border-top-right-radius: $sm;
    }
  }

  tbody tr {
    &:hover {
      background-color: $boxTransparentDarkOutline;
    }

    &:last-child {
      td:first-child {
        border-bottom-left-radius: $sm;
      }

      td:last-child {
        border-bottom-right-radius: $sm;
      }
    }
  }

  th,
  td {
    padding: $xxs $sm;
    border-bottom: 1px solid $chipOutline;
    text-align: center;
  }
}
</style>
