import { type Attribute } from "./item";

type GlobalVariableBase = {
  id: string;
  type: string;
};

export type FineInputBenefit = GlobalVariableBase & {
  type: "fineInputBenefit";
  attrs: Attribute[];
};

export type GlobalVariable = FineInputBenefit;