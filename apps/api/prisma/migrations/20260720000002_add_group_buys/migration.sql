CREATE TABLE "group_buys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "initiator_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "depart_at" TIMESTAMP(3),
    "bid_close_at" TIMESTAMP(3),
    "quota" INTEGER NOT NULL DEFAULT 5,
    "service_fee" TEXT NOT NULL DEFAULT 'free',
    "delivery_method" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "ai_review_status" TEXT NOT NULL DEFAULT 'pending',
    "ai_review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "group_buys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_buy_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_buy_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "group_buy_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_buy_items_group_buy_id_requester_id_key"
  ON "group_buy_items" ("group_buy_id", "requester_id");

CREATE INDEX "group_buys_community_id_type_status_created_at_idx"
  ON "group_buys" ("community_id", "type", "status", "created_at");

CREATE INDEX "group_buys_initiator_id_idx" ON "group_buys" ("initiator_id");

CREATE INDEX "group_buy_items_group_buy_id_status_idx"
  ON "group_buy_items" ("group_buy_id", "status");

ALTER TABLE "group_buys"
  ADD CONSTRAINT "group_buys_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "group_buys"
  ADD CONSTRAINT "group_buys_initiator_id_fkey"
  FOREIGN KEY ("initiator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "group_buy_items"
  ADD CONSTRAINT "group_buy_items_group_buy_id_fkey"
  FOREIGN KEY ("group_buy_id") REFERENCES "group_buys" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_buy_items"
  ADD CONSTRAINT "group_buy_items_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
