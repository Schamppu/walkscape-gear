<script setup lang="ts">
import { computed } from "vue";
import { n } from "@/utils/number";
import { X_LABELS, Y_LABELS } from "@/constants/advancedOptimiser/targets";
import { overallImprovement } from "@/domain/advancedOptimiser/combination";
import { targetKey } from "@/domain/advancedOptimiser/normalisation";
import type { Target } from "@/domain/advancedOptimiser/config";
import type { SearchResult } from "@/domain/advancedOptimiser/search";

const props = defineProps<{
  result: SearchResult;
  targets: Target[];
  applied: boolean;
  locationName: string | null;
}>();

const percent = (ratio: number): string => {
  const value = ratio * 100;
  return `${value > 0 ? "+" : ""}${n(value, 1)}%`;
};

const overall = computed(() =>
  percent(overallImprovement(props.targets, props.result.ratios)),
);

const rows = computed(() =>
  props.targets.map((target) => {
    const ratio = props.result.ratios[targetKey(target)];
    const share = props.result.shares?.[targetKey(target)];
    return {
      key: targetKey(target),
      label: `${X_LABELS[target.x]} / ${Y_LABELS[target.y]}`,
      weight: target.weight,
      change: ratio == null ? "–" : percent(ratio - 1),
      ofBest: share == null ? "" : `${n(Math.min(share, 1) * 100, 0)}% of best`,
    };
  }),
);
</script>

<template>
  <div class="summary" role="status">
    <p v-if="!applied" class="note">Cancelled. Your gear set is unchanged.</p>
    <template v-else>
      <p>
        Equipped a set <strong>{{ overall }}</strong> better than no gear<span
          v-if="locationName"
        >
          at <strong>{{ locationName }}</strong></span
        >.
      </p>
      <p v-if="result.cancelled" class="note">
        Finished early, so this is the best set found so far.
      </p>
      <p v-if="!result.valid" class="warning">
        No set met all of the activity's gear requirements. Check the equipped set.
      </p>
      <ul class="targets">
        <li v-for="row in rows" :key="row.key">
          <span>{{ row.label }}</span>
          <span class="change">
            {{ row.change }}<span v-if="row.ofBest" class="of-best"> ({{ row.ofBest }})</span>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: $xs;

  p {
    margin: 0;
    text-align: center;
  }
}

.note {
  opacity: 0.7;
}

.warning {
  color: $txNegative;
}

.targets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $xxxs;

  li {
    display: flex;
    justify-content: space-between;
    gap: $sm;
  }

  .change {
    font-variant-numeric: tabular-nums;
  }

  .of-best {
    opacity: 0.7;
  }
}
</style>
