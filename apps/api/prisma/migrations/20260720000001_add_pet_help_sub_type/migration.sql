ALTER TABLE "events" ADD COLUMN "sub_type" TEXT;
ALTER TABLE "events" ADD COLUMN "pet_meta" JSONB;

-- 老数据迁移：lost_found -> pet_help + subType=lost + petMeta
UPDATE "events"
SET "type" = 'pet_help',
    "sub_type" = 'lost',
    "pet_meta" = jsonb_build_object(
      'petType', NULL,
      'breed', NULL,
      'name', "title",
      'lostLocation', "location_text",
      'lostTime', "event_time",
      'appearance', "description",
      'photos', "images"
    )
WHERE "type" = 'lost_found';

CREATE INDEX "events_community_type_subtype_status_created_idx"
  ON "events" ("community_id", "type", "sub_type", "status", "created_at");
