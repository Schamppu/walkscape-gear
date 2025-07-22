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

export async function getGearSets(userUuid) {
  const gearSets = await prisma.gearSet.findMany({
    include: {
      items: true,
      tags: { include: { tag: true } },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return gearSets.map((set) => ({
    ...set,
    tags: set.tags.map((t) => t.tag.name),
  }));
}

export async function upsertGearSets(userUuid, payload) {
  const { id, name, tags, items } = payload;

  // Validate tags
  const invalidTags = tags.filter((t) => !validTags.includes(t));
  if (invalidTags.length > 0) {
    return res
      .status(400)
      .json({ error: `Invalid tag(s): ${invalidTags.join(", ")}` });
  }

  try {
    const now = new Date();

    // Upsert the gear set
    const gearSet = id
      ? await prisma.gearSet.update({
          where: { id },
          data: { name, updatedAt: now },
        })
      : await prisma.gearSet.create({
          data: { name, userUuid },
        });

    // Sync tags
    const tagRecords = await prisma.tag.findMany({
      where: { name: { in: tags } },
    });

    await prisma.gearSetTag.deleteMany({ where: { gearSetId: gearSet.id } });
    await prisma.gearSetTag.createMany({
      data: tagRecords.map((tag) => ({
        gearSetId: gearSet.id,
        tagId: tag.id,
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
    res.status(500).json({ error: "Failed to save gear set" });
  }
}
