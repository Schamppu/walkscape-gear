-- CreateTable
CREATE TABLE "User" (
    "userUuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userUuid")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userUuid" TEXT NOT NULL,
    "achievementPoints" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "carpentry" INTEGER NOT NULL,
    "cooking" INTEGER NOT NULL,
    "crafting" INTEGER NOT NULL,
    "fishing" INTEGER NOT NULL,
    "foraging" INTEGER NOT NULL,
    "mining" INTEGER NOT NULL,
    "smithing" INTEGER NOT NULL,
    "trinketry" INTEGER NOT NULL,
    "woodcutting" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userUuid")
);

-- CreateTable
CREATE TABLE "OwnedItem" (
    "userUuid" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quality1" TEXT,
    "quality2" TEXT,

    CONSTRAINT "OwnedItem_pkey" PRIMARY KEY ("userUuid","itemId")
);

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
