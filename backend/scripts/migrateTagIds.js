import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { allTags } from "../prisma/tag-data.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

async function migrate() {
  console.log("Starting Tag ID migration...");

  // Step 1: Get all existing tags (with integer IDs)
  const allDBTags = await prisma.tag.findMany();

  const oldTags = [];
  const tagMap = new Map();
  allDBTags.forEach((tag) => {
    if (allDBTags.some(({ id }) => id === tag.name)) {
      oldTags.push(tag);
      tagMap[tag.id] = tag.name;
    }
  });

  console.log(tagMap);

  // Step 4: Get all GearSetTag relationships that need to be updated
  const gearSetTags = await prisma.gearSetTag.findMany();
  console.log(
    `Found ${gearSetTags.length} gear set tag relationships to migrate`
  );

  // Step 6: Delete old GearSetTag relationships
  await prisma.gearSetTag.deleteMany({});
  console.log("Deleted all old GearSetTag relationships");

  // Step 7: Create new GearSetTag relationships with string IDs
  let migratedCount = 0;
  let skippedCount = 0;

  for (const gearSetTag of gearSetTags) {
    const newTagId = tagMap.get(gearSetTag.tagId);
    if (newTagId) {
      try {
        await prisma.gearSetTag.create({
          data: {
            gearSetId: gearSetTag.gearSetId,
            tagId: newTagId,
          },
        });
        migratedCount++;
      } catch (error) {
        if (error.code === "P2002") {
          console.log(
            `GearSetTag relationship already exists for gearSet ${gearSetTag.gearSetId} and tag ${newTagId}`
          );
        } else {
          console.error(`Error creating GearSetTag:`, error.message);
        }
      }
    } else {
      console.warn(
        `Could not migrate GearSetTag with old tagId: ${gearSetTag.tagId}`
      );
      skippedCount++;
    }
  }

  // Step 8: Delete old tags with integer IDs
  for (const oldTag of oldTags) {
    try {
      await prisma.tag.delete({
        where: { id: oldTag.id },
      });
      console.log(`Deleted old tag: ${oldTag.id} (${oldTag.name})`);
    } catch (error) {
      console.error(`Error deleting old tag ${oldTag.id}:`, error.message);
    }
  }

  console.log("Migration complete!");
  console.log(`Migrated ${migratedCount} GearSetTag relationships`);
  console.log(`Skipped ${skippedCount} GearSetTag relationships`);
  console.log(`Deleted ${oldTags.length} old tags with integer IDs`);

  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
