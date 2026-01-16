<script setup>
defineProps({
  title: String,
  component: [Object, String],
  columns: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["change"]);

function emitChange(payload) {
  emit("change", payload);
}
</script>

<template>
  <tr>
    <td>{{ title }}</td>

    <td v-for="(col, gearSetIndex) in columns" :key="gearSetIndex">
      <div class="info-row">
        <component
          v-for="(item, idx) in col.items"
          :key="idx"
          :is="component"
          v-bind="col.itemProps(item, idx)"
          :gear-set-index="gearSetIndex"
          @change="emitChange"
        />
      </div>
    </td>
  </tr>
</template>
