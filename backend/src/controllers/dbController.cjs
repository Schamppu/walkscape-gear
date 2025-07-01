const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

const getUserInfo = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  const stats = await prisma.playerStats.findUnique({
    where: { userUuid },
  });

  res.json(stats || {});
};

const upsertUserInfo = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { userUuid } });

  if (!user) {
    await prisma.user.create({ data: { userUuid } });
  }

  const { achievementPoints, ...levels } = req.body;

  const stats = await prisma.playerStats.upsert({
    where: { userUuid },
    update: { ...levels, achievementPoints },
    create: { userUuid, ...levels, achievementPoints },
  });

  res.json(stats);
};

const getUserOwnedItems = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  const items = await prisma.ownedItem.findMany({
    where: { userUuid, owned: true },
  });

  const mappedItems = items.map(({ itemId, owned, quality, quality2 }) => {
    return {
      itemId,
      owned,
      quality,
      quality2,
    };
  });

  res.json(mappedItems || {});
};

const upsertUserOwnedItems = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { userUuid } });

  if (!user) {
    await prisma.user.create({ data: { userUuid } });
  }

  const { items } = req.body;

  try {
    await Promise.all(
      items.map((item) =>
        prisma.ownedItem.upsert({
          where: { userUuid_itemId: { userUuid, itemId: item.itemId } },
          update: {
            owned: item.owned,
            quality: item.quality,
            quality2: item.quality2,
          },
          create: {
            userUuid,
            itemId: item.itemId,
            owned: item.owned,
            quality: item.quality,
            quality2: item.quality2,
          },
        })
      )
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
};

const getUserFactionReputations = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  const reputations = await prisma.factionReputation.findMany({
    where: { userUuid },
  });

  const mappedItems = Object.fromEntries(
    reputations.map(({ reputation, value }) => [reputation, value])
  );

  res.json(mappedItems || {});
};

const upsertUserFactionReputations = async (req, res) => {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) return res.status(400).json({ error: "Missing userUuid" });

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { userUuid } });

  if (!user) {
    await prisma.user.create({ data: { userUuid } });
  }

  const { reputations } = req.body;

  try {
    await Promise.all(
      Object.entries(reputations).map(([reputation, value]) =>
        prisma.factionReputation.upsert({
          where: { userUuid_reputation: { userUuid, reputation } },
          update: {
            reputation,
            value,
          },
          create: {
            userUuid,
            reputation,
            value,
          },
        })
      )
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
};

module.exports = {
  getUserInfo,
  upsertUserInfo,
  getUserOwnedItems,
  upsertUserOwnedItems,
  getUserFactionReputations,
  upsertUserFactionReputations,
};
