-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wish_slug_key" ON "Wish"("slug");

-- CreateIndex
CREATE INDEX "Wish_slug_idx" ON "Wish"("slug");

-- CreateIndex
CREATE INDEX "Wish_occasion_idx" ON "Wish"("occasion");
