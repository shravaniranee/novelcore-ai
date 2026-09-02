-- AlterTable
ALTER TABLE "analysis_runs" ADD COLUMN IF NOT EXISTS "analysisMode" TEXT DEFAULT 'DETERMINISTIC_FALLBACK';

-- CreateTable
CREATE TABLE IF NOT EXISTS "invention_features" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "isNovelty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invention_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invention_features_analysisRunId_featureKey_key" ON "invention_features"("analysisRunId", "featureKey");
CREATE INDEX IF NOT EXISTS "invention_features_inventionId_idx" ON "invention_features"("inventionId");
CREATE INDEX IF NOT EXISTS "invention_features_analysisRunId_idx" ON "invention_features"("analysisRunId");

-- AlterTable
ALTER TABLE "feature_overlap_matrix_entries" ADD COLUMN IF NOT EXISTS "featureRecordId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_featureRecordId_idx" ON "feature_overlap_matrix_entries"("featureRecordId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invention_features_analysisRunId_fkey') THEN
    ALTER TABLE "invention_features" ADD CONSTRAINT "invention_features_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invention_features_inventionId_fkey') THEN
    ALTER TABLE "invention_features" ADD CONSTRAINT "invention_features_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_overlap_matrix_entries_featureRecordId_fkey') THEN
    ALTER TABLE "feature_overlap_matrix_entries" ADD CONSTRAINT "feature_overlap_matrix_entries_featureRecordId_fkey" FOREIGN KEY ("featureRecordId") REFERENCES "invention_features"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
