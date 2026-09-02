-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OverlapStatus" AS ENUM ('DISCLOSED', 'PARTIAL', 'NOT_DISCLOSED', 'INSUFFICIENT_EVIDENCE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "feature_overlap_matrix_entries" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "priorArtDocumentId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "overlapStatus" "OverlapStatus" NOT NULL,
    "evidence" TEXT NOT NULL,
    "evidenceSource" TEXT,
    "featureName" TEXT,
    "featureDescription" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_overlap_matrix_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_analysisRunId_priorArtDocume_key" ON "feature_overlap_matrix_entries"("analysisRunId", "priorArtDocumentId", "featureId");
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_inventionId_idx" ON "feature_overlap_matrix_entries"("inventionId");
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_analysisRunId_idx" ON "feature_overlap_matrix_entries"("analysisRunId");
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_priorArtDocumentId_idx" ON "feature_overlap_matrix_entries"("priorArtDocumentId");
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_featureId_idx" ON "feature_overlap_matrix_entries"("featureId");
CREATE INDEX IF NOT EXISTS "feature_overlap_matrix_entries_overlapStatus_idx" ON "feature_overlap_matrix_entries"("overlapStatus");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_overlap_matrix_entries_inventionId_fkey') THEN
    ALTER TABLE "feature_overlap_matrix_entries" ADD CONSTRAINT "feature_overlap_matrix_entries_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_overlap_matrix_entries_analysisRunId_fkey') THEN
    ALTER TABLE "feature_overlap_matrix_entries" ADD CONSTRAINT "feature_overlap_matrix_entries_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_overlap_matrix_entries_priorArtDocumentId_fkey') THEN
    ALTER TABLE "feature_overlap_matrix_entries" ADD CONSTRAINT "feature_overlap_matrix_entries_priorArtDocumentId_fkey" FOREIGN KEY ("priorArtDocumentId") REFERENCES "prior_art_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
