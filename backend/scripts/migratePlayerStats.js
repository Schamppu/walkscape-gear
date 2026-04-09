import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

async function migrate() {
  const stats = await prisma.playerStats.findMany();
  for (const statRow of stats) {
    const { userUuid, updatedAt, ...fields } = statRow;
    for (const [stat, value] of Object.entries(fields)) {
      if (typeof value === "number") {
        await prisma.playerStat.upsert({
          where: { userUuid_stat: { userUuid, stat } },
          update: { value },
          create: { userUuid, stat, value },
        });
      }
    }
  }
  console.log("Migration complete!");
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
