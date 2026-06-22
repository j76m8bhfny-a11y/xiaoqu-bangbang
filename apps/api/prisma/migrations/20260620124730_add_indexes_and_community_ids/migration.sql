-- AlterTable
ALTER TABLE "event_completion_confirmations" ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "rating_content" TEXT,
ADD COLUMN     "rating_tags" JSONB;

-- AlterTable
ALTER TABLE "feedback_process_logs" ADD COLUMN     "community_id" UUID;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "community_id" UUID;

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RankingSnapshot_community_id_period_type_period_key_idx" ON "RankingSnapshot"("community_id", "period_type", "period_key");

-- CreateIndex
CREATE INDEX "banners_community_id_idx" ON "banners"("community_id");

-- CreateIndex
CREATE INDEX "committee_announcements_community_id_idx" ON "committee_announcements"("community_id");

-- CreateIndex
CREATE INDEX "committee_member_claims_community_id_idx" ON "committee_member_claims"("community_id");

-- CreateIndex
CREATE INDEX "committee_members_community_id_idx" ON "committee_members"("community_id");

-- CreateIndex
CREATE INDEX "vote_records_community_id_idx" ON "vote_records"("community_id");

-- CreateIndex
CREATE INDEX "votes_community_id_idx" ON "votes"("community_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_process_logs" ADD CONSTRAINT "feedback_process_logs_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
