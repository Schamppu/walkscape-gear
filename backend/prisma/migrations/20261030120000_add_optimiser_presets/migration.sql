-- CreateTable
CREATE TABLE "OptimiserPreset" (
    "id" SERIAL NOT NULL,
    "userUuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targets" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimiserPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptimiserPreset_userUuid_idx" ON "OptimiserPreset"("userUuid");

-- AddForeignKey
ALTER TABLE "OptimiserPreset" ADD CONSTRAINT "OptimiserPreset_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
