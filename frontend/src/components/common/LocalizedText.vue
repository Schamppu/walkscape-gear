
<script setup>
import { computed } from "vue";

const props = defineProps({
  text: String,
  stats: Object,
  requirements: Object,
});

console.log(props.text);
const parsedParts = computed(() => {
  const parts = [];
  const regex = /<(\w+)\s+(\w+)="([^"]+)"\s*\/>/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(props.text)) !== null) {
    // Push text before tag
    if (match.index > lastIndex) {
      parts.push(props.text.slice(lastIndex, match.index));
    }

    const [_, tag, attr, value] = match;
    parts.push({ type: tag, key: attr, value });

    lastIndex = regex.lastIndex;
  }
  
  // Push remaining text
  if (lastIndex < props.text.length) {
    parts.push(props.text.slice(lastIndex));
  }
  
  console.log(parts);

  return parts;
});
// console.log(props.text, props.localizations);
// console.log(parsedParts);

// const getStatName = (key) => {
//   return (
//     this.localizations?.stats?.singulars?.skilling?.[key]?.name ||
//     `[missing stat: ${key}]`
//   );
// };

// const getSuppName = (key) => {
//   return (
//     this.localizations?.attributes?.singulars?.[key]?.name ||
//     `[missing supp: ${key}]`
//   );
// };
</script>

<template>
  <li>
    <template v-for="(part, index) in parsedParts" :key="index">
      <span v-if="typeof part === 'string'">{{ part }}</span>
      <!-- <span v-else-if="part.type === 'stat'" class="stat">{{
        localizations.statText
      }}</span>
      <span
        v-else-if="part.type === 'supp' && part.value === 'skill'"
        class="supp"
        >{{ localizations.skillText }}</span
      > -->
    </template>
  </li>
</template>

<style lang="scss" scoped>
li {
  padding: 0 $xs;
}

.stat {
  font-weight: bold;
  color: #4caf50;
}
.supp {
  font-style: italic;
  color: #2196f3;
}
</style>
