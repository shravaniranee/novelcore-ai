-- AlterTable
ALTER TABLE "claims" ADD COLUMN "analysisRunId" TEXT;

-- CreateIndex
CREATE INDEX "claims_analysisRunId_idx" ON "claims"("analysisRunId");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "claim_versions" ADD COLUMN "analysisRunId" TEXT,
ADD COLUMN "collectivePriorArtCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "differentiationScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "evidenceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "featureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "groundedFeatureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "groundedFeatureRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN "limitations" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "optimizationReason" TEXT,
ADD COLUMN "priorArtVulnerabilities" JSONB,
ADD COLUMN "singleReferenceCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'AI_ASSISTED',
ADD COLUMN "vulnerabilityDetails" JSONB,
ADD COLUMN "vulnerabilityIndicator" TEXT NOT NULL DEFAULT 'LOW',
ADD COLUMN "vulnerabilityScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "claim_versions_analysisRunId_idx" ON "claim_versions"("analysisRunId");

-- AddForeignKey
ALTER TABLE "claim_versions" ADD CONSTRAINT "claim_versions_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "claim_elements" (
    "id" TEXT NOT NULL,
    "claimVersionId" TEXT NOT NULL,
    "inventionFeatureId" TEXT,
    "featureKey" TEXT NOT NULL,
    "elementKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "elementType" TEXT NOT NULL DEFAULT 'LIMITATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_elements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_elements_claimVersionId_idx" ON "claim_elements"("claimVersionId");

-- CreateIndex
CREATE INDEX "claim_elements_inventionFeatureId_idx" ON "claim_elements"("inventionFeatureId");

-- CreateIndex
CREATE INDEX "claim_elements_featureKey_idx" ON "claim_elements"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "claim_elements_claimVersionId_elementKey_key" ON "claim_elements"("claimVersionId", "elementKey");

-- AddForeignKey
ALTER TABLE "claim_elements" ADD CONSTRAINT "claim_elements_claimVersionId_fkey" FOREIGN KEY ("claimVersionId") REFERENCES "claim_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_elements" ADD CONSTRAINT "claim_elements_inventionFeatureId_fkey" FOREIGN KEY ("inventionFeatureId") REFERENCES "invention_features"("id") ON DELETE SET NULL ON UPDATE CASCADE;
