-- CreateTable
CREATE TABLE "novelty_assessments" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "noveltyScore" INTEGER NOT NULL,
    "noveltyBand" TEXT NOT NULL,
    "evidenceConfidence" DOUBLE PRECISION NOT NULL,
    "singleReferenceRisk" TEXT NOT NULL,
    "collectiveCoverage" DOUBLE PRECISION NOT NULL,
    "patentabilityRisk" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "scoringBreakdown" JSONB NOT NULL DEFAULT '{}',
    "evidenceReferences" JSONB NOT NULL DEFAULT '[]',
    "groqExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "novelty_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novelty_reference_assessments" (
    "id" TEXT NOT NULL,
    "noveltyAssessmentId" TEXT NOT NULL,
    "priorArtDocumentId" TEXT NOT NULL,
    "disclosedFeatureCount" INTEGER NOT NULL DEFAULT 0,
    "partialFeatureCount" INTEGER NOT NULL DEFAULT 0,
    "notDisclosedFeatureCount" INTEGER NOT NULL DEFAULT 0,
    "insufficientEvidenceCount" INTEGER NOT NULL DEFAULT 0,
    "coverageRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "evidenceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "anticipationRisk" TEXT NOT NULL,
    "evidenceDetails" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novelty_reference_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "novelty_assessments_analysisRunId_key" ON "novelty_assessments"("analysisRunId");

-- CreateIndex
CREATE INDEX "novelty_assessments_analysisRunId_idx" ON "novelty_assessments"("analysisRunId");

-- CreateIndex
CREATE INDEX "novelty_assessments_noveltyBand_idx" ON "novelty_assessments"("noveltyBand");

-- CreateIndex
CREATE INDEX "novelty_reference_assessments_noveltyAssessmentId_idx" ON "novelty_reference_assessments"("noveltyAssessmentId");

-- CreateIndex
CREATE INDEX "novelty_reference_assessments_priorArtDocumentId_idx" ON "novelty_reference_assessments"("priorArtDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "novelty_reference_assessments_noveltyAssessmentId_priorArtD_key" ON "novelty_reference_assessments"("noveltyAssessmentId", "priorArtDocumentId");

-- AddForeignKey
ALTER TABLE "novelty_assessments" ADD CONSTRAINT "novelty_assessments_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty_reference_assessments" ADD CONSTRAINT "novelty_reference_assessments_noveltyAssessmentId_fkey" FOREIGN KEY ("noveltyAssessmentId") REFERENCES "novelty_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novelty_reference_assessments" ADD CONSTRAINT "novelty_reference_assessments_priorArtDocumentId_fkey" FOREIGN KEY ("priorArtDocumentId") REFERENCES "prior_art_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
