import { createWebHistory, createRouter } from "vue-router";

import GearTool from "@/GearTool.vue";
import ItemLookup from "@/ItemLookup.vue";

const routes = [
  { path: "/", component: GearTool },
  { path: "/item-lookup", component: ItemLookup },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
