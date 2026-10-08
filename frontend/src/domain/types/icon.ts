import type { paths } from "./generated/api";

export type IconBatchResponse =
  paths["/icons/batch"]["post"]["responses"][200]["content"]["application/json"];
