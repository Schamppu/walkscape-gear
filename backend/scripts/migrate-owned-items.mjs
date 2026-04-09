/**
 * One-time data migration script for the OwnedItem refactor.
 *
 * Reads existing quality/quality2 values and maps them to the new
 * explicit columns (craftedTier, craftedTier2, consumableCommon,
 * consumableFine, petLevel, petRarity, quantity) based on item type.
 *
 * Prerequisites:
 *   1. The Prisma migration adding the new columns has been applied.
 *   2. item-type-snapshot.json exists (run generate-item-snapshot.mjs first).
 *
 * Usage:
 *   node prisma/migrations/migrate-owned-items.mjs [--dry-run]
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

// Load item-type snapshot
const snapshotPath = join(__dirname, "item-type-snapshot.json");
let itemTypes;
try {
  itemTypes = JSON.parse(readFileSync(snapshotPath, "utf-8"));
} catch {
  console.error(
    "item-type-snapshot.json not found. Run generate-item-snapshot.mjs first.",
  );
  process.exit(1);
}
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

// Items that were renamed since the last release.
// Old DB rows reference the old name; the snapshot uses the new name.
const RENAMED_ITEMS = {
  camouflage_cape: "leaf_cape",
  simple_ruler: "flimsy_ruler",
};

// Items that were split/removed — skip these rows, the new items exist separately.
const SKIP_ITEMS = new Set(["map_of_gdte"]);

function migrateRow(row) {
  const renamed = RENAMED_ITEMS[row.itemId];
  const itemInfo = itemTypes[renamed ?? row.itemId];
  const type = itemInfo?.type ?? "loot"; // fallback for unknown items

  const update = {
    quantity: row.owned ? 1 : 0,
    craftedTier: null,
    craftedTier2: null,
    consumableCommon: false,
    consumableFine: false,
    petLevel: null,
    petRarity: null,
  };

  switch (type) {
    case "crafted": {
      update.craftedTier = row.quality ?? "common";
      update.craftedTier2 = row.quality2 ?? null;
      // At least 1 if owned; 2 if two distinct qualities (rings)
      if (row.owned) {
        update.quantity = row.quality2 ? 2 : 1;
      }
      break;
    }

    case "consumable": {
      const q = row.quality;
      const q2 = row.quality2;
      update.consumableCommon =
        q === "consumableCommon" || q2 === "consumableCommon";
      update.consumableFine =
        q === "consumableFine" || q2 === "consumableFine";
      update.quantity =
        (update.consumableCommon ? 1 : 0) + (update.consumableFine ? 1 : 0);
      break;
    }

    case "pet": {
      update.petLevel = parseInt(row.quality, 10) || 0;
      update.petRarity = row.quality2 || "common";
      update.quantity = row.owned ? 1 : 0;
      break;
    }

    default: {
      // loot, collectible, container, etc.
      update.quantity = row.owned ? 1 : 0;
      break;
    }
  }

  return update;
}

async function main() {
  // Use raw SQL to read rows so the script works regardless of Prisma client state
  const allRows = await prisma.$queryRaw`
    SELECT "userUuid", "itemId", "owned", "hidden", "quality", "quality2"
    FROM "OwnedItem"
  `;
  console.log(`Found ${allRows.length} OwnedItem rows to migrate.`);

  if (DRY_RUN) {
    console.log("--- DRY RUN (no changes will be written) ---\n");
  }

  let migrated = 0;
  let skipped = 0;
  let unknownItems = 0;

  const updates = [];

  for (const row of allRows) {
    if (!(row.itemId in itemTypes)) {
      unknownItems++;
    }

    const update = migrateRow(row);

    if (DRY_RUN) {
      const itemInfo = itemTypes[row.itemId];
      console.log(
        `  ${row.itemId} (${itemInfo?.type ?? "unknown"})`,
        `q=${row.quality} q2=${row.quality2}`,
        `->`,
        JSON.stringify(update),
      );
    }

    updates.push({ userUuid: row.userUuid, itemId: row.itemId, ...update });
    migrated++;
  }

  if (!DRY_RUN) {
    // Execute in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.$executeRaw`
            UPDATE "OwnedItem"
            SET "quantity" = ${u.quantity},
                "craftedTier" = ${u.craftedTier},
                "craftedTier2" = ${u.craftedTier2},
                "consumableCommon" = ${u.consumableCommon},
                "consumableFine" = ${u.consumableFine},
                "petLevel" = ${u.petLevel},
                "petRarity" = ${u.petRarity}
            WHERE "userUuid" = ${u.userUuid} AND "itemId" = ${u.itemId}
          `,
        ),
      );
      console.log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: updated ${batch.length} rows`,
      );
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Unknown items (used loot fallback): ${unknownItems}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
