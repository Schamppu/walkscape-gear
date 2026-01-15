import { useSettingsStore } from "@/store/settings";
import { thousandSeparators, decimalSeparators } from "@/constants/separators";

export function n(val, decimals = 3) {
  if (val == null || isNaN(val)) return "";

  const settingsStore = useSettingsStore();
  const { thousandSeparator, decimalSeparator } =
    settingsStore.activitySettings;

  const ts = thousandSeparators[thousandSeparator.display || 0].value;
  const ds = decimalSeparators[decimalSeparator.display || 0].value;

  const rounded = Number(val.toFixed(decimals));
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return formatted.replace(/,/g, ts).replace(/\./g, ds);
}
