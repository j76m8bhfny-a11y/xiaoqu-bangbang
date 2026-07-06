-- AlterTable
ALTER TABLE "committee_announcements" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "event_participants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "market_interests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "market_items" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_skills" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "market_likes" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_likes" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_likes_item_id_user_id_key" ON "market_likes"("item_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_likes_announcement_id_user_id_key" ON "announcement_likes"("announcement_id", "user_id");

-- AddForeignKey
ALTER TABLE "market_likes" ADD CONSTRAINT "market_likes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "market_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_likes" ADD CONSTRAINT "market_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_likes" ADD CONSTRAINT "announcement_likes_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "committee_announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_likes" ADD CONSTRAINT "announcement_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
