-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InventionStatus" AS ENUM ('DRAFT', 'ANALYZING', 'ANALYZED', 'PATENT_READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('INDEPENDENT', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'OPTIMIZED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ObjectionCategory" AS ENUM ('NOVELTY_102', 'OBVIOUSNESS_103', 'ENABLEMENT_112', 'DEFINITENESS_112', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "howItWorks" TEXT NOT NULL,
    "advantages" TEXT NOT NULL,
    "differentiation" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "status" "InventionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "noveltyScore" INTEGER,
    "patentabilityScore" INTEGER,
    "priorArtRisk" "RiskLevel",
    "industrialApplicability" "ImpactLevel",
    "understanding" TEXT,
    "concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipcCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prior_art_documents" (
    "id" TEXT NOT NULL,
    "publicationNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "claimsText" TEXT,
    "source" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'US',
    "filingDate" TIMESTAMP(3),
    "publicationDate" TIMESTAMP(3),
    "ipcCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prior_art_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prior_art_matches" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "priorArtDocId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "overlap" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologyDomain" TEXT,
    "explanation" TEXT,
    "ranking" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prior_art_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "claimNumber" INTEGER NOT NULL,
    "claimType" "ClaimType" NOT NULL DEFAULT 'INDEPENDENT',
    "parentClaimNumber" INTEGER,
    "title" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_versions" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "claimText" TEXT NOT NULL,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "riskReduction" TEXT,
    "differentiationNotes" TEXT,
    "elementOverlapAnalysis" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examiner_reviews" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "overallRisk" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "objectionCategory" "ObjectionCategory" NOT NULL,
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "concern" TEXT NOT NULL,
    "evidence" TEXT,
    "recommendation" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examiner_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "analysisRunId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_opportunities" (
    "id" TEXT NOT NULL,
    "inventionId" TEXT NOT NULL,
    "analysisRunId" TEXT,
    "title" TEXT NOT NULL,
    "impact" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "whyItMatters" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "inventions_userId_idx" ON "inventions"("userId");

-- CreateIndex
CREATE INDEX "inventions_organizationId_idx" ON "inventions"("organizationId");

-- CreateIndex
CREATE INDEX "inventions_status_idx" ON "inventions"("status");

-- CreateIndex
CREATE INDEX "inventions_domain_idx" ON "inventions"("domain");

-- CreateIndex
CREATE INDEX "analysis_runs_inventionId_idx" ON "analysis_runs"("inventionId");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE INDEX "analysis_runs_createdAt_idx" ON "analysis_runs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prior_art_documents_publicationNumber_key" ON "prior_art_documents"("publicationNumber");

-- CreateIndex
CREATE INDEX "prior_art_documents_source_idx" ON "prior_art_documents"("source");

-- CreateIndex
CREATE INDEX "prior_art_documents_jurisdiction_idx" ON "prior_art_documents"("jurisdiction");

-- CreateIndex
CREATE INDEX "prior_art_matches_analysisRunId_idx" ON "prior_art_matches"("analysisRunId");

-- CreateIndex
CREATE INDEX "prior_art_matches_priorArtDocId_idx" ON "prior_art_matches"("priorArtDocId");

-- CreateIndex
CREATE INDEX "prior_art_matches_similarityScore_idx" ON "prior_art_matches"("similarityScore");

-- CreateIndex
CREATE UNIQUE INDEX "prior_art_matches_analysisRunId_priorArtDocId_key" ON "prior_art_matches"("analysisRunId", "priorArtDocId");

-- CreateIndex
CREATE INDEX "claims_inventionId_idx" ON "claims"("inventionId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_inventionId_claimNumber_key" ON "claims"("inventionId", "claimNumber");

-- CreateIndex
CREATE INDEX "claim_versions_claimId_idx" ON "claim_versions"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_versions_claimId_versionNumber_key" ON "claim_versions"("claimId", "versionNumber");

-- CreateIndex
CREATE INDEX "examiner_reviews_inventionId_idx" ON "examiner_reviews"("inventionId");

-- CreateIndex
CREATE INDEX "examiner_reviews_isResolved_idx" ON "examiner_reviews"("isResolved");

-- CreateIndex
CREATE INDEX "examiner_reviews_severity_idx" ON "examiner_reviews"("severity");

-- CreateIndex
CREATE INDEX "reports_inventionId_idx" ON "reports"("inventionId");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "analysis_opportunities_inventionId_idx" ON "analysis_opportunities"("inventionId");

-- CreateIndex
CREATE INDEX "analysis_opportunities_analysisRunId_idx" ON "analysis_opportunities"("analysisRunId");

-- CreateIndex
CREATE INDEX "analysis_opportunities_applied_idx" ON "analysis_opportunities"("applied");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventions" ADD CONSTRAINT "inventions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventions" ADD CONSTRAINT "inventions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prior_art_matches" ADD CONSTRAINT "prior_art_matches_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prior_art_matches" ADD CONSTRAINT "prior_art_matches_priorArtDocId_fkey" FOREIGN KEY ("priorArtDocId") REFERENCES "prior_art_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_versions" ADD CONSTRAINT "claim_versions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examiner_reviews" ADD CONSTRAINT "examiner_reviews_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_opportunities" ADD CONSTRAINT "analysis_opportunities_inventionId_fkey" FOREIGN KEY ("inventionId") REFERENCES "inventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_opportunities" ADD CONSTRAINT "analysis_opportunities_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
