-- Phase 10: Examiner Simulation & Review Engine Migration

-- 1. Extend RiskLevel enum with CRITICAL
ALTER TYPE "RiskLevel" ADD VALUE IF NOT EXISTS 'CRITICAL';

-- 2. Create Enums for Examiner Review
CREATE TYPE "ExaminerReviewStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "ExaminerFindingType" AS ENUM ('POTENTIAL_ANTICIPATION', 'POTENTIAL_OBVIOUSNESS', 'POTENTIAL_SUPPORT_CONCERN', 'EVIDENCE_INSUFFICIENT', 'NO_MATERIAL_CONCERN');

-- 3. Extend examiner_reviews table
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "analysisRunId" TEXT;
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "claimId" TEXT;
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "claimVersionId" TEXT;
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "status" "ExaminerReviewStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "examiner_reviews" ADD COLUMN IF NOT EXISTS "claimReviews" JSONB DEFAULT '[]';
ALTER TABLE "examiner_reviews" ALTER COLUMN "objectionCategory" DROP NOT NULL;
ALTER TABLE "examiner_reviews" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "examiner_reviews" ALTER COLUMN "title" SET DEFAULT 'Examiner Simulation Review';
ALTER TABLE "examiner_reviews" ALTER COLUMN "concern" DROP NOT NULL;
ALTER TABLE "examiner_reviews" ALTER COLUMN "recommendation" DROP NOT NULL;

-- Add indexes and foreign key
CREATE INDEX IF NOT EXISTS "examiner_reviews_analysisRunId_idx" ON "examiner_reviews"("analysisRunId");
CREATE INDEX IF NOT EXISTS "examiner_reviews_status_idx" ON "examiner_reviews"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'examiner_reviews_analysisRunId_fkey'
  ) THEN
    ALTER TABLE "examiner_reviews" ADD CONSTRAINT "examiner_reviews_analysisRunId_fkey"
    FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Create examiner_findings table
CREATE TABLE IF NOT EXISTS "examiner_findings" (
    "id" TEXT NOT NULL,
    "examinerReviewId" TEXT NOT NULL,
    "findingType" "ExaminerFindingType" NOT NULL,
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "claimNumber" INTEGER NOT NULL,
    "claimVersionNumber" INTEGER NOT NULL,
    "claimElementKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priorArtDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportingFeatureKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "recommendation" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'DETERMINISTIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examiner_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "examiner_findings_examinerReviewId_idx" ON "examiner_findings"("examinerReviewId");
CREATE INDEX IF NOT EXISTS "examiner_findings_findingType_idx" ON "examiner_findings"("findingType");
CREATE INDEX IF NOT EXISTS "examiner_findings_claimNumber_idx" ON "examiner_findings"("claimNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'examiner_findings_examinerReviewId_fkey'
  ) THEN
    ALTER TABLE "examiner_findings" ADD CONSTRAINT "examiner_findings_examinerReviewId_fkey"
    FOREIGN KEY ("examinerReviewId") REFERENCES "examiner_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
