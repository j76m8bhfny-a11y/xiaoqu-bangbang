-- CreateTable
CREATE TABLE "community_applications" (
    "id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "estimated_households" INTEGER,
    "reason" TEXT,
    "material_type" TEXT NOT NULL,
    "material_url" TEXT NOT NULL,
    "door_photo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "approved_community_id" UUID,
    "support_count" INTEGER NOT NULL DEFAULT 0,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_application_supports" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_application_supports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_applications_status_support_count_idx" ON "community_applications"("status", "support_count");

-- CreateIndex
CREATE INDEX "community_applications_applicant_id_idx" ON "community_applications"("applicant_id");

-- CreateIndex
CREATE INDEX "community_application_supports_user_id_idx" ON "community_application_supports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_application_supports_application_id_user_id_key" ON "community_application_supports"("application_id", "user_id");

-- AddForeignKey
ALTER TABLE "community_applications" ADD CONSTRAINT "community_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_application_supports" ADD CONSTRAINT "community_application_supports_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "community_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_application_supports" ADD CONSTRAINT "community_application_supports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
