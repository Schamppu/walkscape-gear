import { PrismaClient } from "../generated/prisma/index.js";
import { validTags } from "../../prisma/tag-data.js";

const prisma = new PrismaClient();

const ALLOWED_STATS = new Set([
  "achievementPoints",
  "agility",
  "carpentry",
  "cooking",
  "crafting",
  "fishing",
  "foraging",
  "mining",
  "smithing",
  "trinketry",
  "woodcutting",
]);

const ALLOWED_REPUTATIONS = new Set([
  "erdwiseReputation",
  "tutorialAreaReputation",
  "halflingRebelsReputation",
  "trellinReputation",
  "jarvoniaReputation",
  "syrenthiaReputation",
]);

const ALLOWED_SETTINGS = new Set([
  "showOwned",
  "showUseful",
  "showCombined",
  "hideOwnedCollectibles",
  "undoRedo",
]);

export async function ensureUser(userUuid) {
  let user = await prisma.user.findUnique({ where: { userUuid } });
  if (!user) {
    user = await prisma.user.create({ data: { userUuid } });
  }
  return user;
}

export async function getUserStats(userUuid) {
  const stats = await prisma.playerStat.findMany({ where: { userUuid } });
  return Object.fromEntries(stats.map(({ stat, value }) => [stat, value]));
}

export async function upsertUserStats(userUuid, statsObj) {
  await ensureUser(userUuid);
  const validEntries = Object.entries(statsObj).filter(([stat]) =>
    ALLOWED_STATS.has(stat)
  );
  if (validEntries.length === 0) throw new Error("No valid stats provided");
  await Promise.all(
    validEntries.map(([stat, value]) =>
      prisma.playerStat.upsert({
        where: { userUuid_stat: { userUuid, stat } },
        update: { stat, value },
        create: { userUuid, stat, value },
      })
    )
  );
}

export async function getUserOwnedItems(userUuid) {
  const items = await prisma.ownedItem.findMany({
    where: { userUuid, OR: [{ owned: true }, { hidden: true }] },
  });
  return items.map(({ itemId, owned, hidden, quality, quality2 }) => ({
    itemId,
    owned,
    hidden,
    quality,
    quality2,
  }));
}

export async function upsertUserOwnedItems(userUuid, items) {
  await ensureUser(userUuid);
  await Promise.all(
    items.map((item) =>
      prisma.ownedItem.upsert({
        where: { userUuid_itemId: { userUuid, itemId: item.itemId } },
        update: {
          owned: item.owned,
          hidden: item.hidden,
          quality: item.quality,
          quality2: item.quality2,
        },
        create: {
          userUuid,
          itemId: item.itemId,
          owned: item.owned,
          hidden: item.hidden,
          quality: item.quality,
          quality2: item.quality2,
        },
      })
    )
  );
}

export async function getUserFactionReputations(userUuid) {
  const reps = await prisma.factionReputation.findMany({ where: { userUuid } });
  return Object.fromEntries(
    reps.map(({ reputation, value }) => [reputation, value])
  );
}

export async function upsertUserFactionReputations(userUuid, reputationsObj) {
  await ensureUser(userUuid);
  const validEntries = Object.entries(reputationsObj).filter(([reputation]) =>
    ALLOWED_REPUTATIONS.has(reputation)
  );
  if (validEntries.length === 0)
    throw new Error("No valid reputations provided");
  await Promise.all(
    validEntries.map(([reputation, value]) =>
      prisma.factionReputation.upsert({
        where: { userUuid_reputation: { userUuid, reputation } },
        update: { reputation, value },
        create: { userUuid, reputation, value },
      })
    )
  );
}

export async function getGearSetTags() {
  return await prisma.tag.findMany({ orderBy: { id: "asc" } }); // Changed from name to id
}

export async function getGearSets(userUuid, includeItems = false) {
  const gearSets = await prisma.gearSet.findMany({
    where: { userUuid },
    include: {
      items: includeItems,
      tags: { include: { tag: true } },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return gearSets.map((set) => ({
    ...set,
    tags: set.tags.map((t) => t.tag.id), // Return tag IDs instead of names
  }));
}

export async function getGearSet(userUuid, gearSetId) {
  const gearSet = await prisma.gearSet.findFirst({
    where: {
      id: gearSetId,
      userUuid,
    },
    include: {
      items: true,
      tags: { include: { tag: true } },
    },
  });

  if (!gearSet) {
    throw new Error("Gear set not found");
  }

  return {
    ...gearSet,
    tags: gearSet.tags.map((t) => t.tag.id), // Return tag IDs instead of names
  };
}

export async function upsertGearSet(userUuid, payload) {
  const { id, name, tags, items } = payload;

  // Validate tags
  const invalidTags = tags.filter((t) => !validTags.includes(t));
  if (invalidTags.length > 0) {
    throw new Error(`Invalid tag(s): ${invalidTags.join(", ")}`);
  }

  try {
    await ensureUser(userUuid);
    const now = new Date();

    // Upsert the gear set
    const gearSet = id
      ? await prisma.gearSet.update({
          where: { id, userUuid },
          data: { name, updatedAt: now },
        })
      : await prisma.gearSet.create({
          data: { name, userUuid },
        });

    // Sync tags
    const tagRecords = await prisma.tag.findMany({
      where: { id: { in: tags } }, // Changed from name to id
    });

    await prisma.gearSetTag.deleteMany({ where: { gearSetId: gearSet.id } });
    await prisma.gearSetTag.createMany({
      data: tagRecords.map((tag) => ({
        gearSetId: gearSet.id,
        tagId: tag.id, // Now using string ID instead of numeric id
      })),
    });

    // Sync items
    await prisma.gearSetItem.deleteMany({ where: { gearSetId: gearSet.id } });
    await prisma.gearSetItem.createMany({
      data: items.map((item) => ({
        gearSetId: gearSet.id,
        slotType: item.slotType,
        slotIndex: item.slotIndex,
        itemId: item.itemId,
        quality: item.quality,
      })),
    });

    return { message: "Gear set saved", gearSetId: gearSet.id };
  } catch (error) {
    console.error("Error upserting gear set:", error);
    throw new Error("Failed to save gear set");
  }
}

export async function deleteGearSet(userUuid, gearSetId) {
  try {
    // First, verify the gear set exists and belongs to the user
    const gearSet = await prisma.gearSet.findUnique({
      where: { id: gearSetId },
    });

    if (!gearSet) {
      throw new Error("Gear set not found");
    }

    if (gearSet.userUuid !== userUuid) {
      throw new Error("You can only delete your own gear sets");
    }

    // Delete all associated data (Prisma will handle the order due to foreign key constraints)
    await prisma.gearSetTag.deleteMany({ where: { gearSetId } });
    await prisma.gearSetItem.deleteMany({ where: { gearSetId } });
    await prisma.gearSet.delete({ where: { id: gearSetId } });

    return { message: "Gear set deleted successfully" };
  } catch (error) {
    console.error("Error deleting gear set:", error);
    throw new Error(error.message || "Failed to delete gear set");
  }
}

export async function getUserSettings(userUuid) {
  const settings = await prisma.userSetting.findMany({
    where: { userUuid },
  });
  return Object.fromEntries(
    settings.map(({ setting, value, display }) => [setting, { value, display }])
  );
}

export async function upsertUserSettings(userUuid, settingsArr) {
  await ensureUser(userUuid);
  const validEntries = settingsArr.filter(({ setting }) =>
    ALLOWED_SETTINGS.has(setting)
  );
  if (validEntries.length === 0) throw new Error("No valid settings provided");

  await Promise.all(
    validEntries.map(({ setting, display, value }) => {
      return prisma.userSetting.upsert({
        where: { userUuid_setting: { userUuid, setting } },
        update: { value, display },
        create: { userUuid, setting, value, display },
      });
    })
  );
}
