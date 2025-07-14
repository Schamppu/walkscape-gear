import { PrismaClient } from "../src/generated/prisma/index.js";
import { itemService } from "../src/services/index.js";
const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting ID migration...");

  // Get all owned items with old itemIds
  const ownedItems = await prisma.ownedItem.findMany();
  console.log(`Found ${ownedItems.length} owned items to migrate`);

  // Create a map of old ID to new ID
  const idMap = new Map();
  const uniqueOldIds = [...new Set(ownedItems.map((item) => item.itemId))];
  console.log(`Found ${uniqueOldIds.length} unique old item IDs`);

  // Fetch new IDs for each old ID
  for (const oldId of uniqueOldIds) {
    try {
      const item = await itemService.getById(oldId);
      const newId = item.id;
      idMap.set(oldId, newId);
      // console.log(`Mapped ${oldId} -> ${newId}`);
    } catch (error) {
      console.error(`Failed to fetch item for old ID: ${oldId}`, error.message);
      // You might want to handle this case - skip or use default value
    }
  }

  console.log(`Successfully mapped ${idMap.size} IDs`);

  const owned_items = await prisma.ownedItem.findMany();
  // Update database with new IDs
  let updatedCount = 0;
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
        console.log(
          `Updated ${ownedItem.userUuid}:${ownedItem.itemId} -> ${newId}`
        );
      } catch (error) {
        console.error(
          `Failed to update record for ${ownedItem.userUuid}:${ownedItem.itemId}`,
          error.message
        );
      }
    } else {
      console.warn(`No new ID found for old ID: ${ownedItem.itemId}`);
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} records.`);
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
