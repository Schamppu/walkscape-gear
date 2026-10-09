<script setup lang="ts">
import HelpTip from "@/components/common/HelpTip.vue";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";

const store = useAdvancedOptimiserStore();

const onFineChange = (event: Event): void => {
  store.updateSettings({ allowFineConsumables: (event.target as HTMLInputElement).checked });
};

const onStockChange = (event: Event): void => {
  store.updateSettings({ minConsumableStock: Number((event.target as HTMLInputElement).value) });
};
</script>

<template>
  <details class="optimiser-settings">
    <summary class="typography-h4">
      Settings
      <help-tip
        label="Optimiser settings"
        text="These settings apply to every activity, and to the quick set too."
      />
    </summary>

    <table class="settings-table">
      <tbody>
        <tr>
          <td class="setting-label">
            <label for="optimiser-allow-fine">Suggest fine consumables</label>
          </td>
          <td class="setting-action">
            <input
              id="optimiser-allow-fine"
              type="checkbox"
              :checked="store.settings.allowFineConsumables"
              @change="onFineChange"
            />
          </td>
        </tr>
        <tr>
          <td class="setting-label">
            <span class="label-with-help">
              <label for="optimiser-min-stock">Minimum consumable stock</label>
              <help-tip
                label="Minimum consumable stock"
                text="Consumables you own fewer of aren't suggested; 0 means no limit. Common and fine are counted separately, from your last character import."
              />
            </span>
          </td>
          <td class="setting-action">
            <input
              id="optimiser-min-stock"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              class="stock"
              :value="store.settings.minConsumableStock"
              @change="onStockChange"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>

<style lang="scss" scoped>
@use "@/styles/mixins/settingsTableShared" as table;

.optimiser-settings[open] summary {
  margin-bottom: $md;
}

.settings-table {
  @include table.settings-table($label-width: auto, $control-width: 1%);
  // Let help tooltips extend past the table (the mixin clips for its corners).
  & {
    overflow: visible;
  }

  td.setting-action {
    white-space: nowrap;
  }
}

.label-with-help {
  display: inline-flex;
  align-items: center;
  gap: $xs;
}

.stock {
  width: 5rem;
  background: $bgPrimary;
  color: $txPrimary;
  border: 1px solid $boxDarkOutline;
  border-radius: $xs;
  padding: $xxs $xs;
}
</style>
