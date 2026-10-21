-- AlterTable
ALTER TABLE "Wish" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Wish_expiresAt_idx" ON "Wish"("expiresAt");

