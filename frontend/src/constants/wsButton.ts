export const wsButtonVariants = ["default", "secondary", "icon-only"] as const;

export type WsButtonVariant = (typeof wsButtonVariants)[number];

export const wsButtonVariantClassMap: Record<WsButtonVariant, string> = {
  default: "",
  secondary: "button--secondary",
  "icon-only": "button--icon-only",
};
