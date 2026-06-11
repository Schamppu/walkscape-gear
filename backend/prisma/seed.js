import "dotenv/config";
import { pathToFileURL } from "url";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
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

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

async function seedSkillTags() {
  console.log("🌱 Seeding default tags...");

  await Promise.all([
    ...skillTags.map(({ name, id }) =>
      prisma.tag.upsert({
        where: { id },
        update: {
          name,
          category: "skill",
          icon: `assets/icons/text/skill_icons/${id}.png`,
        },
        create: {
          id,
          name,
          category: "skill",
          icon: `assets/icons/text/skill_icons/${id}.png`,
        },
      })
    ),
    ...attributeTags.map(({ name, id }) =>
      prisma.tag.upsert({
        where: { id },
        update: {
          name,
          category: "attribute",
          icon: `assets/icons/text/stats/skilling/${id}.png`,
        },
        create: {
          id,
          name,
          category: "attribute",
          icon: `assets/icons/text/stats/skilling/${id}.png`,
        },
      })
    ),
    ...factionTags.map(({ name, id }) =>
      prisma.tag.upsert({
        where: { id },
        update: {
          name,
          category: "faction",
          icon: `assets/icons/text/coatofarms/${id}.png`,
        },
        create: {
          id,
          name,
          category: "faction",
          icon: `assets/icons/text/coatofarms/${id}.png`,
        },
      })
    ),
    ...otherTags.map(({ name, id, icon }) =>
      prisma.tag.upsert({
        where: { id },
        update: { name, category: "other", icon },
        create: { id, name, category: "other", icon },
      })
    ),
  ]);

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

const TEST_USER_UUID = "";

/**
 * Seeds default tags (and optional test data) and disconnects the
 * Prisma client used for seeding. Safe to call from the server at
 * startup — it uses its own client, separate from the request handlers.
 */
export async function runSeed() {
  try {
    await seedSkillTags();
    if (TEST_USER_UUID) {
      await seedTestData(TEST_USER_UUID);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run automatically when invoked directly (e.g. `npm run seed`),
// but not when this module is imported by the server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
