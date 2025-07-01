/*
  Warnings:

  - You are about to drop the `PlayerStats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlayerStats" DROP CONSTRAINT "PlayerStats_userUuid_fkey";

-- DropTable
DROP TABLE "PlayerStats";
