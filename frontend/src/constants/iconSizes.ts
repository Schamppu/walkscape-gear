/**
 * Purpose:
 * Defines the available icon size keys and their corresponding pixel values
 * used by icon-rendering components.
 *
 * Responsibilities:
 * - Provide a canonical set of size identifiers
 * - Map size identifiers to CSS pixel values
 *
 * Does NOT:
 * - Mutate global state
 * - Import Vue or reactive utilities
 */

export type IconSizeKey =
  | "xxxs"
  | "xxs"
  | "xs"
  | "sm"
  | "md"
  | "mdp"
  | "lg"
  | "xl"
  | "xxl"
  | "default";

export const iconSizeMap: Record<IconSizeKey, string> = {
  xxxs: "8px",
  xxs: "12px",
  xs: "16px",
  sm: "24px",
  md: "32px",
  default: "32px",
  mdp: "40px",
  lg: "48px",
  xl: "64px",
  xxl: "96px",
};

export const iconSizeKeys: IconSizeKey[] = Object.keys(iconSizeMap) as IconSizeKey[];
