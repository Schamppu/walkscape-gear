/**
 * Purpose:
 * Lists of numeric separators presented in settings UI.
 *
 * Responsibilities:
 * - Provide typed options for thousand and decimal separators
 * - Keep locale/format options centralized for settings and formatting utilities
 */

import { SettingOption } from "./types";

export const thousandSeparators: SettingOption[] = [
  { value: " ", name: "Space ( )" },
  { value: "'", name: "Apostrophe (')" },
  { value: ".", name: "Point (.)" },
  { value: ",", name: "Comma (,)" },
];

export const decimalSeparators: SettingOption[] = [
  { value: ".", name: "Point (.)" },
  { value: ",", name: "Comma (, )" },
];

export default {
  thousandSeparators,
  decimalSeparators,
};
