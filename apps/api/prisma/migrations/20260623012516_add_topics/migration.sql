-- AlterTable
ALTER TABLE "events" ADD COLUMN     "ai_comment" TEXT,
ADD COLUMN     "topic_id" UUID;

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "dislike_count" INTEGER NOT NULL DEFAULT 0,
    "closed_like_count" INTEGER NOT NULL DEFAULT 0,
    "closed_dislike_count" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "closed_summary" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" UUID,
    "created_by" UUID NOT NULL,
    "ai_review_status" TEXT NOT NULL DEFAULT 'pending',
    "ai_review_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_comments" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "event_id" UUID,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "dislike_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "ai_review_status" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_likes" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_ratings" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_comment_likes" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_merge_suggestions" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "source_topic_id" UUID NOT NULL,
    "target_topic_id" UUID NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,

    CONSTRAINT "topic_merge_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_community_id_status_like_count_idx" ON "topics"("community_id", "status", "like_count");

-- CreateIndex
CREATE INDEX "topic_comments_topic_id_event_id_like_count_idx" ON "topic_comments"("topic_id", "event_id", "like_count");

-- CreateIndex
CREATE UNIQUE INDEX "topic_likes_topic_id_user_id_scope_key" ON "topic_likes"("topic_id", "user_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "topic_ratings_topic_id_user_id_key" ON "topic_ratings"("topic_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_comment_likes_comment_id_user_id_key" ON "topic_comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "topic_merge_suggestions_community_id_status_idx" ON "topic_merge_suggestions"("community_id", "status");

-- CreateIndex
CREATE INDEX "events_topic_id_idx" ON "events"("topic_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comments" ADD CONSTRAINT "topic_comments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comments" ADD CONSTRAINT "topic_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comments" ADD CONSTRAINT "topic_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comments" ADD CONSTRAINT "topic_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "topic_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_likes" ADD CONSTRAINT "topic_likes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_likes" ADD CONSTRAINT "topic_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_ratings" ADD CONSTRAINT "topic_ratings_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_ratings" ADD CONSTRAINT "topic_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comment_likes" ADD CONSTRAINT "topic_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "topic_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_comment_likes" ADD CONSTRAINT "topic_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_merge_suggestions" ADD CONSTRAINT "topic_merge_suggestions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_merge_suggestions" ADD CONSTRAINT "topic_merge_suggestions_source_topic_id_fkey" FOREIGN KEY ("source_topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_merge_suggestions" ADD CONSTRAINT "topic_merge_suggestions_target_topic_id_fkey" FOREIGN KEY ("target_topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_merge_suggestions" ADD CONSTRAINT "topic_merge_suggestions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
