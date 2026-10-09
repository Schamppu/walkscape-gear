import type { components } from "./generated/api";

export type StatDefinition = components["schemas"]["StatListItem"];

/**
 * A stat as shown in the stats list: either a `StatDefinition` or a pseudo
 * stat built from an attribute, whose `id` and `type` are the attribute's
 * stat id rather than a known `StatId` / `StatType`.
 */
export type DisplayStat = Pick<StatDefinition, "name" | "icon"> & {
  id: string;
  type: string;
};
