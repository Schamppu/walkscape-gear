/*
  Warnings:

  - You are about to drop the column `quality` on the `OwnedItem` table. All the data in the column will be lost.
  - You are about to drop the column `quality2` on the `OwnedItem` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "GearSlotType" ADD VALUE 'activityInput';

-- AlterTable
ALTER TABLE "OwnedItem" DROP COLUMN "quality",
DROP COLUMN "quality2";
