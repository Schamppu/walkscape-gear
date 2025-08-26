-- CreateTable
CREATE TABLE "UserSetting" (
    "userUuid" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "display" INTEGER NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("userUuid","setting")
);

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
