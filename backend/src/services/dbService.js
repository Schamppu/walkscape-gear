import { PrismaClient } from "../generated/prisma/index.js";

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
