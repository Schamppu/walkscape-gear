import { execSync } from "child_process";

if (process.env.NODE_ENV === "development") {
  execSync("npx prisma migrate reset --force", {
    stdio: "inherit",
  });
} else {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "inherit" });
}
