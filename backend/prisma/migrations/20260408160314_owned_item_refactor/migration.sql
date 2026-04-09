-- AlterTable
ALTER TABLE "OwnedItem" ADD COLUMN     "consumableCommon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consumableFine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "craftedTier" TEXT,
ADD COLUMN     "craftedTier2" TEXT,
ADD COLUMN     "petLevel" INTEGER,
ADD COLUMN     "petRarity" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;
