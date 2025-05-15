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

module.exports = {
  getUserInfo,
  upsertUserInfo,
};
