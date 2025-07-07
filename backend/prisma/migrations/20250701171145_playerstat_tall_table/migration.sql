-- CreateTable
CREATE TABLE "PlayerStat" (
    "userUuid" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "PlayerStat_pkey" PRIMARY KEY ("userUuid","stat")
);

-- AddForeignKey
ALTER TABLE "PlayerStat" ADD CONSTRAINT "PlayerStat_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
