/**
 * Purpose:
 * Common lists of display option values used by settings UI.
 *
 * Responsibilities:
 * - Provide named lists for dropdowns used in settings (undo/redo, drop rate, etc.)
 * - Reuse typed `SettingOption` entries so UI can render label + value pairs
 */

import { SettingOption } from "./types";

export const undoRedoOptions: SettingOption[] = [
  { value: "hidden", name: "Hidden" },
  { value: "gearTab", name: "Gear Tab" },
  { value: "static", name: "Static buttons" },
];

export const shownDropRateOptions: SettingOption[] = [
  { value: "stepsPerItem", name: "Steps per Item" },
  { value: "stepsPerNormal", name: "Steps per Normal" },
];

export const gearLayoutOptions: SettingOption[] = [
  { value: "original", name: "Original" },
  { value: "cozy", name: "Cozy" },
  { value: "compact", name: "Compact" },
  { value: "verticalTools", name: "Vertical tools" },
];

export default {
  undoRedoOptions,
  shownDropRateOptions,
  gearLayoutOptions,
};
