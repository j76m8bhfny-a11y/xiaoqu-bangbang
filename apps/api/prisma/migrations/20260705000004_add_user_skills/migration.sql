-- AlterTable
ALTER TABLE "users" ADD COLUMN "wechat_id" TEXT;

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_skills_user_id_idx" ON "user_skills"("user_id");

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
