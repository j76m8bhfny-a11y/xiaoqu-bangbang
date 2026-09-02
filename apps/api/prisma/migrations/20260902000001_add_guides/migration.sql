-- DropIndex
DROP INDEX "group_buy_items_group_buy_id_requester_id_key";

-- AlterTable
ALTER TABLE "group_buy_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "group_buys" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "guides" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_likes" (
    "id" UUID NOT NULL,
    "guide_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_favorites" (
    "id" UUID NOT NULL,
    "guide_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_comments" (
    "id" UUID NOT NULL,
    "guide_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "guide_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_comment_likes" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guides_community_id_category_status_created_at_idx" ON "guides"("community_id", "category", "status", "created_at");

-- CreateIndex
CREATE INDEX "guides_author_id_idx" ON "guides"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "guide_likes_guide_id_user_id_key" ON "guide_likes"("guide_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guide_favorites_guide_id_user_id_key" ON "guide_favorites"("guide_id", "user_id");

-- CreateIndex
CREATE INDEX "guide_comments_guide_id_created_at_idx" ON "guide_comments"("guide_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guide_comment_likes_comment_id_user_id_key" ON "guide_comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_items_group_buy_id_requester_id_name_key" ON "group_buy_items"("group_buy_id", "requester_id", "name");

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_likes" ADD CONSTRAINT "guide_likes_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_likes" ADD CONSTRAINT "guide_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_favorites" ADD CONSTRAINT "guide_favorites_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_favorites" ADD CONSTRAINT "guide_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_comments" ADD CONSTRAINT "guide_comments_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_comments" ADD CONSTRAINT "guide_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_comments" ADD CONSTRAINT "guide_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "guide_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_comment_likes" ADD CONSTRAINT "guide_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "guide_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_comment_likes" ADD CONSTRAINT "guide_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "events_community_type_subtype_status_created_idx" RENAME TO "events_community_id_type_sub_type_status_created_at_idx";

