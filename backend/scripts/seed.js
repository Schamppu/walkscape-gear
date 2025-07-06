import { PrismaClient } from "../src/generated/prisma/index.js";
import * as dbService from "../src/services/dbService.js";
import {
  skillService,
  factionService,
  itemService,
} from "../src/services/index.js";

const prisma = new PrismaClient();

async function seedTestData(userUuid) {
  console.log(`Seeding test data for user: ${userUuid}`);

  // skills
  const level = 75;
  const skills = await skillService.list();
  const skillsData = Object.fromEntries(skills.map(({ id }) => [id, level]));
  skillsData["achievementPoints"] = 200;
  await dbService.upsertUserStats(userUuid, skillsData);
  console.log(`added ${skills.length} skills with level ${level}`);

  // factions
  const baseReputation = 99;
  const factions = await factionService.list();
  const reputations = Object.fromEntries(
    factions
      .filter(({ reputation }) => reputation !== null)
      .map(({ reputation }) => [reputation, baseReputation])
  );
  await dbService.upsertUserFactionReputations(userUuid, reputations);
  console.log(
    `added ${
      Object.keys(reputations).length
    } factions with reputation ${baseReputation}`
  );

  // owned items
  const itemCategories = await itemService.getCategorizedItems();
  const items = itemCategories.flatMap(({ categories }) => {
    return categories.flatMap(({ items, qualities }) => {
      return items.map(({ id, quality: itemQuality, consumableType }) => {
        const defaultQuality = !consumableType
          ? itemQuality
          : "consumableCommon";

        const quality = qualities ? "legendary" : defaultQuality;
        const quality2 = qualities && qualities === 2 ? "epic" : "common";

        return {
          itemId: id,
          owned: true,
          hidden: false,
          quality,
          quality2,
        };
      });
    });
  });
  await dbService.upsertUserOwnedItems(userUuid, items);
  console.log(`added ${items.length} owned items`);

  console.log("Finished seeding test data for user:", userUuid);
}

async function main() {
  const testUserUuid = "";
  if (testUserUuid) {
    await seedTestData(testUserUuid);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
