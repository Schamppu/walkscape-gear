import { execSync } from "child_process";

if (process.env.NODE_ENV === "development") {
  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "inherit",
  });
} else {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
