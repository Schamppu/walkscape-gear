import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { itemService } from "../src/services/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

// Helper function to add delay between requests
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Process items in batches with delay and selective retry logic
async function processInBatches(items, batchSize, delayMs, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    let batch = items.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        items.length / batchSize
      )}`
    );

    let batchResults = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (batch.length > 0 && retryCount < maxRetries) {
      // Process current batch in parallel
      const currentResults = await Promise.allSettled(batch.map(processFn));

      // Separate successful and failed items
      const successful = [];
      const toRetry = [];

      currentResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successful.push(result.value);
        } else {
          // Add failed item back to retry list
          toRetry.push(batch[index]);
          console.warn(
            `Item ${batch[index]} failed, will retry. Error: ${
              result.reason?.message || "Unknown error"
            }`
          );
        }
      });

      batchResults.push(...successful);
      batch = toRetry; // Only retry the failed items
      retryCount++;

      // Add delay before retry if there are items to retry
      if (batch.length > 0 && retryCount < maxRetries) {
        console.log(
          `Retrying ${batch.length} failed items (attempt ${
            retryCount + 1
          }/${maxRetries})...`
        );
        await delay(1000);
      }
    }

    // Log final failures
    if (batch.length > 0) {
      console.error(
        `${batch.length} items failed after ${maxRetries} retries:`,
        batch
      );
      // Add failed items as failed results
      batch.forEach((failedItem) => {
        batchResults.push({
          oldId: failedItem,
          newId: null,
          success: false,
          error: "Max retries exceeded",
        });
      });
    }

    results.push(...batchResults);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }
  return results;
}

async function migrate() {
  console.log("Starting ID migration...");

  // Get all owned items with old itemIds
  const ownedItems = await prisma.ownedItem.findMany();
  console.log(`Found ${ownedItems.length} owned items to migrate`);

  // Create a map of old ID to new ID
  const idMap = new Map();
  const allItemIds = ownedItems.map((item) => item.itemId);

  // Filter out invalid IDs
  const validOldIds = allItemIds.filter((id) => {
    // Skip if not a string or if it's the literal text "[object Object]"
    if (typeof id !== "string" || id === "[object Object]") {
      console.warn(`Skipping invalid ID: ${id} (type: ${typeof id})`);
      return false;
    }
    return true;
  });

  const uniqueOldIds = [...new Set(validOldIds)];
  console.log(`Found ${uniqueOldIds.length} unique valid old item IDs`);
  console.log(
    `Filtered out ${allItemIds.length - validOldIds.length} invalid IDs`
  );

  // Fetch new IDs in batches with retry logic
  const fetchItem = async (oldId) => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const item = await itemService.getById(oldId);
        const newId = item.id;
        return { oldId, newId, success: true };
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(
            `Failed to fetch item for old ID: ${oldId} after ${maxRetries} attempts`
          );
          return { oldId, newId: null, success: false, error: error.message };
        }
        console.warn(`Attempt ${attempt} failed for ${oldId}, retrying...`);
        await delay(1000); // Wait 1 second before retry
      }
    }
  };
  // Process in batches of 5 with 0.5 second delay between batches
  const results = await processInBatches(uniqueOldIds, 5, 500, fetchItem);

  // Build the ID map from successful results
  let successCount = 0;
  let failCount = 0;
  let alreadyMigratedCount = 0;

  for (const result of results) {
    if (result.success) {
      if (result.oldId === result.newId) {
        // ID hasn't changed, mark as already migrated
        alreadyMigratedCount++;
        // console.log(`ID ${result.oldId} already migrated (no change needed)`);
      } else {
        idMap.set(result.oldId, result.newId);
        successCount++;
      }
    } else {
      console.log(`Failed to map ID ${result.oldId}`);
      failCount++;
    }
  }

  console.log(`Successfully mapped ${successCount} IDs`);
  console.log(`Already migrated (no change): ${alreadyMigratedCount} IDs`);
  console.log(`Failed to map ${failCount} IDs`);

  // Update database with new IDs
  let updatedCount = 0;
  let skippedCount = 0;
  let noChangeCount = 0;

  for (const ownedItem of ownedItems) {
    const newId = idMap.get(ownedItem.itemId);
    if (newId) {
      try {
        // Delete old record and create new one (since itemId is part of primary key)
        await prisma.ownedItem.delete({
          where: {
            userUuid_itemId: {
              userUuid: ownedItem.userUuid,
              itemId: ownedItem.itemId,
            },
          },
        });

        await prisma.ownedItem.create({
          data: {
            userUuid: ownedItem.userUuid,
            itemId: newId,
            owned: ownedItem.owned,
            hidden: ownedItem.hidden,
            quality: ownedItem.quality,
            quality2: ownedItem.quality2,
          },
        });

        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`Updated ${updatedCount} records so far...`);
        }
      } catch (error) {
        console.error(
          `Failed to update record for ${ownedItem.userUuid}:${ownedItem.itemId}`,
          error.message
        );
      }
    } else {
      // Check if this item was already migrated (old ID = new ID)
      const wasAlreadyMigrated =
        uniqueOldIds.includes(ownedItem.itemId) &&
        results.find(
          (r) => r.oldId === ownedItem.itemId && r.oldId === r.newId
        );

      if (wasAlreadyMigrated) {
        noChangeCount++;
      } else {
        skippedCount++;
        console.warn(
          `Skipping ${ownedItem.userUuid}:${ownedItem.itemId} - no new ID found`
        );
      }
    }
  }

  console.log(`Migration complete!`);
  console.log(`Updated: ${updatedCount} records`);
  console.log(`No change needed: ${noChangeCount} records`);
  console.log(`Skipped (failed to fetch): ${skippedCount} records`);
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
