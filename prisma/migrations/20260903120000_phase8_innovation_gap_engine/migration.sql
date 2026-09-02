-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('CROWDED', 'MODERATELY_EXPLORED', 'PARTIALLY_EXPLORED', 'UNDERSERVED', 'POTENTIALLY_DISTINCTIVE');

-- AlterTable
ALTER TABLE "analysis_opportunities"
  ADD COLUMN "opportunityKey" TEXT,
  ADD COLUMN "gapType" "GapType" NOT NULL DEFAULT 'MODERATELY_EXPLORED',
  ADD COLUMN "relatedFeatureKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "supportingPriorArtIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "coverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "differentiationScore" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "evidenceDetails" JSONB,
  ADD COLUMN "limitations" TEXT,
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "explanationProvenance" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "analysis_opportunities_analysisRunId_opportunityKey_key" ON "analysis_opportunities"("analysisRunId", "opportunityKey");

-- CreateIndex
CREATE INDEX "analysis_opportunities_gapType_idx" ON "analysis_opportunities"("gapType");
