-- Phase 11: Unified Patent Intelligence Report

-- 1. Extend ReportStatus enum
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- 2. Add structured report columns
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "reportVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "executiveSummary" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "overallAssessment" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "finalRecommendation" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "sectionsSnapshot" JSONB DEFAULT '{}';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "evidenceSources" JSONB DEFAULT '[]';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "provenance" TEXT NOT NULL DEFAULT 'DETERMINISTIC';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "disclaimer" TEXT;

-- 3. Deduplicate reports per analysisRunId (keep newest)
DELETE FROM "reports" a
USING "reports" b
WHERE a."analysisRunId" IS NOT NULL
  AND a."analysisRunId" = b."analysisRunId"
  AND a."id" <> b."id"
  AND a."createdAt" < b."createdAt";

-- 4. Unique constraint: one current report per AnalysisRun
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_analysisRunId_key'
  ) THEN
    ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisRunId_key" UNIQUE ("analysisRunId");
  END IF;
END $$;
