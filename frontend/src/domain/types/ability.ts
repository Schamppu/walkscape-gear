import type { Requirement } from "./common";
import type { Attribute } from "./item";

export type AbilitySummary = {
  id: string;
  name: string;
  type: string;
  desc: string;
  icon: string;
};

export type AbilityAction = {
  type: string;
  runtimeType: string;
  /** Present on `effect` actions (active abilities carry their stats here). */
  attributes?: Attribute[];
  [key: string]: unknown;
};

export type AbilityData = {
  dataType: string;
  actions: AbilityAction[];
};

export type AbilityCooldown = {
  steps?: number;
  hours?: number;
  requirements: Requirement[];
};

export type AbilityDetail = AbilitySummary & {
  requirements: Requirement[];
  cooldown?: AbilityCooldown;
  data: AbilityData[];
  attributes?: Attribute[];
};
