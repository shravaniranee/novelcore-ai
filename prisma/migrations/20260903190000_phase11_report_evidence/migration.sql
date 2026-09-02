-- Phase 11 hardening: required analysisRunId, recommendationReason, ReportEvidence

-- 1. Remove orphan reports without analysisRunId (cannot satisfy NOT NULL)
DELETE FROM "reports" WHERE "analysisRunId" IS NULL;

-- 2. Add recommendationReason
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "recommendationReason" TEXT;

-- 3. Make analysisRunId required
ALTER TABLE "reports" ALTER COLUMN "analysisRunId" SET NOT NULL;

-- 4. Cascade delete when AnalysisRun is removed (replace SetNull FK if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_analysisRunId_fkey'
  ) THEN
    ALTER TABLE "reports" DROP CONSTRAINT "reports_analysisRunId_fkey";
  END IF;
END $$;

ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisRunId_fkey"
  FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Ensure unique on analysisRunId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_analysisRunId_key'
  ) THEN
    ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisRunId_key" UNIQUE ("analysisRunId");
  END IF;
END $$;

-- 6. ReportEvidence table
CREATE TABLE IF NOT EXISTS "report_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "featureKey" TEXT,
    "publicationNumber" TEXT,
    "claimNumber" INTEGER,
    "elementKey" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_evidence_reportId_sectionKey_sourceType_sourceId_key"
  ON "report_evidence"("reportId", "sectionKey", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "report_evidence_reportId_idx" ON "report_evidence"("reportId");
CREATE INDEX IF NOT EXISTS "report_evidence_sourceType_idx" ON "report_evidence"("sourceType");
CREATE INDEX IF NOT EXISTS "report_evidence_sourceId_idx" ON "report_evidence"("sourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_evidence_reportId_fkey'
  ) THEN
    ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
