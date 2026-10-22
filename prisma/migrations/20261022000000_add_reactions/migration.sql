-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "wishId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_wishId_idx" ON "Reaction"("wishId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_wishId_voterHash_key" ON "Reaction"("wishId", "voterHash");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

