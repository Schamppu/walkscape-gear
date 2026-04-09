import { PrismaClient } from "../src/generated/prisma/client";
import * as dbService from "../src/services/dbService.js";
import {
  skillService,
  factionService,
  itemService,
} from "../src/services/index.js";
import {
  skillTags,
  attributeTags,
  factionTags,
  otherTags,
} from "./tag-data.js";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function seedSkillTags() {
  console.log("🌱 Seeding default tags...");

  skillTags.forEach(async ({ name, id }) => {
    const icon = `assets/icons/text/skill_icons/${id}.png`;
    await prisma.tag.upsert({
      where: { id },
      update: { name, category: "skill", icon },
      create: { id, name, category: "skill", icon },
    });
  });

  attributeTags.forEach(async ({ name, id }) => {
    const icon = `assets/icons/text/stats/skilling/${id}.png`;
    await prisma.tag.upsert({
      where: { id },
      update: { name, category: "attribute", icon },
      create: { id, name, category: "attribute", icon },
    });
  });

  factionTags.forEach(async ({ name, id }) => {
    const icon = `assets/icons/text/coatofarms/${id}.png`;
    await prisma.tag.upsert({
      where: { id },
      update: { name, category: "faction", icon },
      create: { id, name, category: "faction", icon },
    });
  });

  otherTags.forEach(async ({ name, id, icon }) => {
    await prisma.tag.upsert({
      where: { id },
      update: { name, category: "other", icon },
      create: { id, name, category: "other", icon },
    });
  });

  console.log("✅ Tag seed complete.");
}

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
      return items.map(({ id, quality: itemQuality, consumableType, type }) => {
        const entry = {
          itemId: id,
          owned: true,
          hidden: false,
          quantity: 1,
          craftedTier: null,
          craftedTier2: null,
          consumableCommon: false,
          consumableFine: false,
          petLevel: null,
          petRarity: null,
        };

        if (type === "consumable") {
          entry.consumableCommon = true;
        } else if (type === "crafted") {
          entry.craftedTier = "legendary";
          entry.craftedTier2 = qualities === 2 ? "epic" : null;
          entry.quantity = qualities === 2 ? 2 : 1;
        }

        return entry;
      });
    });
  });
  await dbService.upsertUserOwnedItems(userUuid, items);
  console.log(`added ${items.length} owned items`);

  console.log("Finished seeding test data for user:", userUuid);
}

async function main() {
  seedSkillTags();

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
