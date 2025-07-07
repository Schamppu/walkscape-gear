-- CreateTable
CREATE TABLE "FactionReputation" (
    "userUuid" TEXT NOT NULL,
    "reputation" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "FactionReputation_pkey" PRIMARY KEY ("userUuid","reputation")
);

-- AddForeignKey
ALTER TABLE "FactionReputation" ADD CONSTRAINT "FactionReputation_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
