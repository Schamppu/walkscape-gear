/**
 * One-time script to generate an item-type snapshot from a categorized_items.json export.
 * Run this BEFORE the data migration to produce item-type-snapshot.json.
 *
 * Usage:
 *   node scripts/generate-item-snapshot.mjs
 *
 * Requires categorized_items.json to exist in the same directory.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = join(__dirname, "categorized_items.json");
const groups = JSON.parse(readFileSync(inputPath, "utf-8"));

const snapshot = {};

for (const group of groups) {
  for (const category of group.categories) {
    for (const item of category.items) {
      snapshot[item.id] = {
        type: item.type,
        gearType: item.gearType ?? null,
      };
    }
  }
}

const count = Object.keys(snapshot).length;
const outPath = join(__dirname, "item-type-snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Wrote ${count} items to ${outPath}`);
