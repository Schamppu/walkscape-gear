/**
 * Purpose:
 * Shared types for settings-related constants.
 *
 * Responsibilities:
 * - Provide canonical TypeScript types for options used in settings UI
 * - Keep option and setting shapes consistent across the app
 */

export type SettingOption = {
  value: string;
  name: string;
};

export type Setting<T = unknown> = {
  label: string;
  display: number;
  displayOptions?: SettingOption[];
  value: T;
  showEnable?: boolean;
  showDisplay?: boolean;
};

export default SettingOption;
