import { execSync } from "child_process";

if (process.env.NODE_ENV === "development") {
  execSync("npx prisma migrate reset --force", {
    stdio: "inherit",
  });
} else {
  // Apply pending migrations to the production database.
  // The Prisma Client is already generated at image-build time
  // (see backend/Dockerfile), so we do NOT regenerate it here.
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
