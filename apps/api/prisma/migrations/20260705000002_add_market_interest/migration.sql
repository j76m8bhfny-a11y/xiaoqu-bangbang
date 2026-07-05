-- AlterTable
ALTER TABLE "market_items" ADD COLUMN "buyer_id" UUID;

-- CreateTable
CREATE TABLE "market_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "market_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_interests_item_id_idx" ON "market_interests"("item_id");

-- CreateIndex
CREATE INDEX "market_items_buyer_id_idx" ON "market_items"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_interests_item_id_user_id_key" ON "market_interests"("item_id", "user_id");

-- AddForeignKey
ALTER TABLE "market_items" ADD CONSTRAINT "market_items_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_interests" ADD CONSTRAINT "market_interests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "market_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_interests" ADD CONSTRAINT "market_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
