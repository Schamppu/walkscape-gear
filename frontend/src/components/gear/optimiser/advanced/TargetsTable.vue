<script setup lang="ts">
import WsButton from "@/components/primitives/WsButton.vue";
import { icons } from "@/constants/iconPaths";
import { X_LABELS, Y_LABELS } from "@/constants/advancedOptimiser/targets";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  type Target,
  type XValue,
  type YValue,
} from "@/domain/advancedOptimiser/config";
import {
  availableXValues,
  availableYValues,
  isTargetValid,
  type TargetContext,
} from "@/domain/advancedOptimiser/targets";

const props = defineProps<{
  targets: Target[];
  context: TargetContext;
}>();

const emit = defineEmits<{
  (event: "update", index: number, patch: Partial<Target>): void;
  (event: "remove", index: number): void;
}>();

/** The other rows' targets, whose X / Y pairs row `index` can't pick. */
const othersOf = (index: number): Target[] => props.targets.filter((_, i) => i !== index);

/** Adds the row's current value so an unavailable (e.g. saved) target still shows. */
const withCurrent = <T extends string>(values: T[], current: T): T[] =>
  values.includes(current) ? values : [current, ...values];

const xOptions = (index: number): XValue[] =>
  withCurrent(availableXValues(othersOf(index), props.context), props.targets[index].x);

const yOptions = (index: number): YValue[] =>
  withCurrent(
    availableYValues(props.targets[index].x, othersOf(index), props.context),
    props.targets[index].y,
  );

const isAvailable = (index: number): boolean => isTargetValid(props.targets[index], props.context);

const onXChange = (index: number, event: Event): void => {
  const x = (event.target as HTMLSelectElement).value as XValue;
  const ys = availableYValues(x, othersOf(index), props.context);
  // Keep the current Y when the new pair is free, otherwise take the first free one.
  const current = props.targets[index].y;
  emit("update", index, { x, y: ys.includes(current) ? current : ys[0] });
};

const onYChange = (index: number, event: Event): void => {
  emit("update", index, { y: (event.target as HTMLSelectElement).value as YValue });
};

const onWeightInput = (index: number, event: Event): void => {
  emit("update", index, { weight: Number((event.target as HTMLInputElement).value) });
};
</script>

<template>
  <div class="targets-table-container">
    <table class="targets-table">
      <thead>
        <tr>
          <th>Target</th>
          <th>Per</th>
          <th>Weight</th>
          <th>Remove</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(target, index) in targets"
          :key="index"
          :class="{ disabled: target.weight === 0, unavailable: !isAvailable(index) }"
        >
          <td class="target-x">
            <select
              :value="target.x"
              aria-label="Target"
              @change="onXChange(index, $event)"
            >
              <option v-for="x in xOptions(index)" :key="x" :value="x">
                {{ X_LABELS[x] }}
              </option>
            </select>
          </td>
          <td class="target-y">
            <select
              :value="target.y"
              aria-label="Per"
              @change="onYChange(index, $event)"
            >
              <option v-for="y in yOptions(index)" :key="y" :value="y">
                {{ Y_LABELS[y] }}
              </option>
            </select>
          </td>
          <td class="target-weight">
            <div class="weight">
              <input
                type="range"
                :min="MIN_WEIGHT"
                :max="MAX_WEIGHT"
                step="1"
                :value="target.weight"
                aria-label="Weight"
                @input="onWeightInput(index, $event)"
              />
              <span class="weight-value">{{ target.weight }}</span>
            </div>
          </td>
          <td class="setting-action">
            <ws-button
              :icon-path="icons.delete"
              variant="icon-only"
              aria-label="Remove target"
              @click="emit('remove', index)"
            />
          </td>
          <td v-if="!isAvailable(index)" class="unavailable-note">
            Not available for this activity, so it's ignored
          </td>
        </tr>
        <tr v-if="!targets.length">
          <td class="empty" colspan="4">No targets</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/mixins/settingsTableShared" as table;

.targets-table-container {
  max-height: 18rem;
  overflow-y: auto;
  border-radius: $sm;
}

// Each target is two lines: "X / Y  delete" on top, a full-width weight
// slider below. The header row is only there for screen readers.
.targets-table {
  display: block;
  @include table.settings-table($control-width: auto);

  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  tbody {
    display: block;
  }

  tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    grid-template-areas:
      "x y del"
      "w w w";
    align-items: center;
    gap: $xxs $xs;
    padding: $xs $sm;

    &:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    &.disabled {
      .target-x,
      .target-y {
        opacity: 0.6;
      }
    }

    &.unavailable {
      grid-template-areas:
        "x y del"
        "w w w"
        "n n n";

      .target-x,
      .target-y,
      .target-weight {
        opacity: 0.5;
      }
    }
  }

  // :nth-child(n) matches the specificity of the mixin's
  // `tr:not(:last-child) td` border rule so this one wins.
  tbody tr:nth-child(n) > td {
    padding: 0;
    border: none;
    width: auto;
  }

  select {
    width: 100%;
  }

  td.target-x {
    grid-area: x;
  }

  td.target-y {
    grid-area: y;
    display: flex;
    align-items: center;
    gap: $xxs;

    &::before {
      content: "/";
      opacity: 0.7;
    }
  }

  td.target-weight {
    grid-area: w;
  }

  td.setting-action {
    grid-area: del;
  }

  td.unavailable-note {
    grid-area: n;
    color: $txNegative;
    font-size: 0.875em;
  }

  .weight {
    display: flex;
    align-items: center;
    gap: $xs;

    input[type="range"] {
      flex: 1;
      min-width: 0;
    }

    .weight-value {
      min-width: 1.5em;
      text-align: right;
    }
  }

  td.empty {
    grid-column: 1 / -1;
    text-align: center;
    opacity: 0.7;
  }
}
</style>
