/**
 * NovelCore AI — Evidence-Based Novelty Scoring Engine (Phase 7)
 *
 * This module provides transparent, deterministic, and evidence-grounded
 * evaluation of novelty and patentability risk.
 *
 * Strict Principles:
 * 1. Groq / LLMs MUST NOT choose, invent, or override numeric scores.
 * 2. Retrieval similarity != Feature disclosure (retrieval is evidence for investigation).
 * 3. Single-reference coverage (potential single-reference anticipation concern) is
 *    strictly separated from collective prior-art coverage (collective prior-art coverage indicator).
 * 4. Evidence confidence is evaluated independently from novelty.
 * 5. All conclusions point to authentic PriorArtDocument and InventionFeature records.
 */

import { prisma } from '@/lib/prisma';
import { OverlapStatus, RiskLevel } from '@prisma/client';

// ==============================================================================
// 1. Types & Interfaces
// ==============================================================================

export type NoveltyBand =
  | 'HIGH_NOVELTY'
  | 'MODERATE_NOVELTY'
  | 'LOW_NOVELTY'
  | 'INSUFFICIENT_EVIDENCE';

export type AnticipationRisk = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type PatentabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_EVIDENCE';

export interface EvidenceDetail {
  featureKey: string;
  featureName: string;
  status: OverlapStatus;
  quote: string;
  source: string;
  explanation?: string;
}

export interface SingleReferenceAssessment {
  priorArtDocumentId: string;
  publicationNumber: string;
  title: string;
  disclosedFeatureCount: number;
  partialFeatureCount: number;
  notDisclosedFeatureCount: number;
  insufficientEvidenceCount: number;
  coverageRatio: number; // 0.0 - 1.0
  evidenceConfidence: number; // 0.0 - 1.0
  anticipationRisk: AnticipationRisk;
  potentialAnticipationConcern: boolean;
  evidenceDetails: EvidenceDetail[];
}

export interface CollectiveCoverageDetails {
  collectiveCoverageRatio: number; // 0.0 - 1.0
  disclosedFeatures: string[];
  partialFeatures: string[];
  undisclosedFeatures: string[];
  featureCoverageMap: Record<
    string,
    { maxScore: number; bestReference: string; status: OverlapStatus }
  >;
}

export interface EvidenceReferenceItem {
  priorArtDocumentId: string;
  publicationNumber: string;
  featureKey: string;
  overlapStatus: OverlapStatus;
  evidenceQuote: string;
}

export interface DeterministicNoveltyResult {
  noveltyScore: number; // 0 - 100
  noveltyBand: NoveltyBand;
  evidenceConfidence: number; // 0.0 - 1.0
  singleReferenceRisk: AnticipationRisk;
  collectiveCoverage: number; // 0.0 - 1.0
  patentabilityRisk: PatentabilityRisk;
  scoringBreakdown: {
    maxSingleCoverage: number;
    collectiveCoverage: number;
    singleReferenceWeight: number; // 0.60
    collectiveWeight: number; // 0.40
    rawPenalty: number;
    noveltyFeaturesCount: number;
    totalFeaturesCount: number;
    confidenceThreshold: number; // 0.40
    formulaExplanation: string;
  };
  referenceAssessments: SingleReferenceAssessment[];
  collectiveDetails: CollectiveCoverageDetails;
  evidenceReferences: EvidenceReferenceItem[];
}

export interface FeatureInputForNovelty {
  id: string; // featureKey or UUID
  featureKey: string;
  name: string;
  description?: string;
  isNovelty?: boolean;
}

export interface MatrixEntryForNovelty {
  priorArtDocumentId: string;
  featureId: string; // featureKey
  overlapStatus: OverlapStatus;
  evidence: string;
  evidenceSource?: string | null;
  explanation?: string | null;
  featureName?: string | null;
}

export interface PriorArtDocMeta {
  id: string;
  publicationNumber: string;
  title: string;
}

// ==============================================================================
// 2. Deterministic Weighting & Scoring Functions
// ==============================================================================

/**
 * Returns numeric disclosure weight for an overlap status.
 * DISCLOSED = 1.0, PARTIAL = 0.5, NOT_DISCLOSED = 0.0, INSUFFICIENT_EVIDENCE = 0.0
 */
export function getStatusDisclosureWeight(status: OverlapStatus): number {
  switch (status) {
    case 'DISCLOSED':
      return 1.0;
    case 'PARTIAL':
      return 0.5;
    case 'NOT_DISCLOSED':
    case 'INSUFFICIENT_EVIDENCE':
    default:
      return 0.0;
  }
}

/**
 * Returns significance weight for an invention feature.
 * Novelty candidate features carry 1.5x weight.
 */
export function getFeatureSignificanceWeight(feature: FeatureInputForNovelty): number {
  return feature.isNovelty ? 1.5 : 1.0;
}

/**
 * Calculates single-reference coverage and anticipation risk for each prior-art document.
 */
export function calculateSingleReferenceAssessments(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[]
): SingleReferenceAssessment[] {
  const totalFeatureWeight = features.reduce(
    (acc, f) => acc + getFeatureSignificanceWeight(f),
    0
  ) || 1.0;

  const results: SingleReferenceAssessment[] = [];

  for (const doc of priorArtDocs) {
    const docEntries = matrixEntries.filter((e) => e.priorArtDocumentId === doc.id);

    let disclosedCount = 0;
    let partialCount = 0;
    let notDisclosedCount = 0;
    let insufficientEvidenceCount = 0;
    let weightedDisclosureSum = 0;
    let substantiatedCells = 0;

    const evidenceDetails: EvidenceDetail[] = [];

    for (const feat of features) {
      const entry = docEntries.find(
        (e) => e.featureId === feat.featureKey || e.featureId === feat.id
      );

      const status: OverlapStatus = entry ? entry.overlapStatus : 'INSUFFICIENT_EVIDENCE';
      const quote = entry?.evidence || '';
      const source = entry?.evidenceSource || 'none';

      if (status === 'DISCLOSED') disclosedCount++;
      else if (status === 'PARTIAL') partialCount++;
      else if (status === 'NOT_DISCLOSED') notDisclosedCount++;
      else insufficientEvidenceCount++;

      // Weight contribution
      const featWeight = getFeatureSignificanceWeight(feat);
      const discWeight = getStatusDisclosureWeight(status);
      weightedDisclosureSum += featWeight * discWeight;

      // Confidence check: non-empty citation and not insufficient
      if (
        status !== 'INSUFFICIENT_EVIDENCE' &&
        quote.trim().length > 0 &&
        quote !== 'INSUFFICIENT_EVIDENCE'
      ) {
        substantiatedCells++;
      }

      evidenceDetails.push({
        featureKey: feat.featureKey,
        featureName: feat.name,
        status,
        quote,
        source,
        explanation: entry?.explanation || undefined,
      });
    }

    const coverageRatio = Math.min(1.0, Math.max(0.0, weightedDisclosureSum / totalFeatureWeight));
    const evidenceConfidence =
      features.length > 0
        ? (features.length - insufficientEvidenceCount) / features.length
        : 0.0;

    // Anticipation Risk categorisation:
    // Potential single-reference anticipation concern under 35 U.S.C. 102
    let anticipationRisk: AnticipationRisk = 'LOW';
    let potentialAnticipationConcern = false;

    if (coverageRatio >= 0.90) {
      anticipationRisk = 'CRITICAL';
      potentialAnticipationConcern = true;
    } else if (coverageRatio >= 0.70) {
      anticipationRisk = 'HIGH';
      potentialAnticipationConcern = true;
    } else if (coverageRatio >= 0.40) {
      anticipationRisk = 'MODERATE';
    } else {
      anticipationRisk = 'LOW';
    }

    results.push({
      priorArtDocumentId: doc.id,
      publicationNumber: doc.publicationNumber,
      title: doc.title,
      disclosedFeatureCount: disclosedCount,
      partialFeatureCount: partialCount,
      notDisclosedFeatureCount: notDisclosedCount,
      insufficientEvidenceCount: insufficientEvidenceCount,
      coverageRatio: Number(coverageRatio.toFixed(4)),
      evidenceConfidence: Number(evidenceConfidence.toFixed(4)),
      anticipationRisk,
      potentialAnticipationConcern,
      evidenceDetails,
    });
  }

  // Sort by coverageRatio descending
  return results.sort((a, b) => b.coverageRatio - a.coverageRatio);
}

/**
 * Calculates collective coverage across all candidate prior art documents (collective prior-art coverage indicator).
 */
export function calculateCollectiveCoverage(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[]
): CollectiveCoverageDetails {
  const totalFeatureWeight = features.reduce(
    (acc, f) => acc + getFeatureSignificanceWeight(f),
    0
  ) || 1.0;

  const disclosedFeatures: string[] = [];
  const partialFeatures: string[] = [];
  const undisclosedFeatures: string[] = [];
  const featureCoverageMap: Record<
    string,
    { maxScore: number; bestReference: string; status: OverlapStatus }
  > = {};

  let weightedCollectiveSum = 0;

  for (const feat of features) {
    const featEntries = matrixEntries.filter(
      (e) => e.featureId === feat.featureKey || e.featureId === feat.id
    );

    let maxScore = 0.0;
    let bestRef = '';
    let bestStatus: OverlapStatus = 'NOT_DISCLOSED';

    for (const entry of featEntries) {
      const score = getStatusDisclosureWeight(entry.overlapStatus);
      if (score > maxScore) {
        maxScore = score;
        bestRef = entry.priorArtDocumentId;
        bestStatus = entry.overlapStatus;
      }
    }

    featureCoverageMap[feat.featureKey] = {
      maxScore,
      bestReference: bestRef,
      status: bestStatus,
    };

    if (bestStatus === 'DISCLOSED') {
      disclosedFeatures.push(feat.featureKey);
    } else if (bestStatus === 'PARTIAL') {
      partialFeatures.push(feat.featureKey);
    } else {
      undisclosedFeatures.push(feat.featureKey);
    }

    const featWeight = getFeatureSignificanceWeight(feat);
    weightedCollectiveSum += featWeight * maxScore;
  }

  const collectiveCoverageRatio = Math.min(
    1.0,
    Math.max(0.0, weightedCollectiveSum / totalFeatureWeight)
  );

  return {
    collectiveCoverageRatio: Number(collectiveCoverageRatio.toFixed(4)),
    disclosedFeatures,
    partialFeatures,
    undisclosedFeatures,
    featureCoverageMap,
  };
}

/**
 * Calculates overall evidence confidence score.
 * Evaluates the proportion of matrix cells that have conclusive determinations
 * (DISCLOSED, PARTIAL, NOT_DISCLOSED) versus INSUFFICIENT_EVIDENCE.
 */
export function calculateOverallEvidenceConfidence(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[]
): number {
  if (matrixEntries.length === 0) return 0.0;

  let conclusiveCount = 0;
  for (const entry of matrixEntries) {
    if (entry.overlapStatus !== 'INSUFFICIENT_EVIDENCE') {
      conclusiveCount++;
    }
  }

  return Number((conclusiveCount / matrixEntries.length).toFixed(4));
}

/**
 * Core Deterministic Novelty Engine.
 * Combines single-reference anticipation, collective coverage, and evidence confidence.
 */
export function calculateDeterministicNovelty(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[]
): DeterministicNoveltyResult {
  // 1. Single reference assessments
  const referenceAssessments = calculateSingleReferenceAssessments(
    features,
    matrixEntries,
    priorArtDocs
  );

  // 2. Collective coverage details
  const collectiveDetails = calculateCollectiveCoverage(features, matrixEntries);

  // 3. Evidence confidence
  const evidenceConfidence = calculateOverallEvidenceConfidence(features, matrixEntries);

  // 4. Max single reference coverage
  const maxSingleCoverage =
    referenceAssessments.length > 0 ? referenceAssessments[0].coverageRatio : 0.0;

  const collectiveCoverage = collectiveDetails.collectiveCoverageRatio;

  // Check for empty data conditions
  const hasInsufficientData =
    features.length === 0 || priorArtDocs.length === 0 || matrixEntries.length === 0;

  // 5. Penalty formula: 60% single-reference coverage + 40% collective coverage
  const SINGLE_WEIGHT = 0.6;
  const COLLECTIVE_WEIGHT = 0.4;
  const rawPenalty = hasInsufficientData
    ? 0.0
    : SINGLE_WEIGHT * maxSingleCoverage + COLLECTIVE_WEIGHT * collectiveCoverage;

  // Novelty score bounds [0, 100]. If data is empty/insufficient, score is 0 with INSUFFICIENT_EVIDENCE band.
  const noveltyScore = hasInsufficientData
    ? 0
    : Math.max(0, Math.min(100, Math.round(100 * (1.0 - rawPenalty))));

  // 6. Novelty Band
  let noveltyBand: NoveltyBand;
  if (hasInsufficientData || evidenceConfidence < 0.4) {
    noveltyBand = 'INSUFFICIENT_EVIDENCE';
  } else if (noveltyScore >= 75) {
    noveltyBand = 'HIGH_NOVELTY';
  } else if (noveltyScore >= 50) {
    noveltyBand = 'MODERATE_NOVELTY';
  } else {
    noveltyBand = 'LOW_NOVELTY';
  }

  // 7. Overall single reference risk
  const singleReferenceRisk: AnticipationRisk =
    hasInsufficientData
      ? 'LOW'
      : referenceAssessments.length > 0
      ? referenceAssessments[0].anticipationRisk
      : 'LOW';

  // 8. Deterministic Patentability Risk
  let patentabilityRisk: PatentabilityRisk;
  if (hasInsufficientData || evidenceConfidence < 0.4) {
    patentabilityRisk = 'INSUFFICIENT_EVIDENCE';
  } else if (maxSingleCoverage >= 0.7 || collectiveCoverage >= 0.85) {
    patentabilityRisk = 'HIGH';
  } else if (maxSingleCoverage >= 0.4 || collectiveCoverage >= 0.6) {
    patentabilityRisk = 'MEDIUM';
  } else {
    patentabilityRisk = 'LOW';
  }

  // 9. Traceable evidence references
  const evidenceReferences: EvidenceReferenceItem[] = [];
  for (const entry of matrixEntries) {
    if (entry.overlapStatus === 'DISCLOSED' || entry.overlapStatus === 'PARTIAL') {
      const doc = priorArtDocs.find((d) => d.id === entry.priorArtDocumentId);
      evidenceReferences.push({
        priorArtDocumentId: entry.priorArtDocumentId,
        publicationNumber: doc?.publicationNumber || entry.priorArtDocumentId,
        featureKey: entry.featureId,
        overlapStatus: entry.overlapStatus,
        evidenceQuote: entry.evidence,
      });
    }
  }

  return {
    noveltyScore,
    noveltyBand,
    evidenceConfidence,
    singleReferenceRisk,
    collectiveCoverage,
    patentabilityRisk,
    scoringBreakdown: {
      maxSingleCoverage,
      collectiveCoverage,
      singleReferenceWeight: SINGLE_WEIGHT,
      collectiveWeight: COLLECTIVE_WEIGHT,
      rawPenalty: Number(rawPenalty.toFixed(4)),
      noveltyFeaturesCount: features.filter((f) => f.isNovelty).length,
      totalFeaturesCount: features.length,
      confidenceThreshold: 0.4,
      formulaExplanation:
        'noveltyScore = round(100 * (1 - (0.60 * maxSingleCoverage + 0.40 * collectiveCoverage)))',
    },
    referenceAssessments,
    collectiveDetails,
    evidenceReferences,
  };
}

// ==============================================================================
// 3. PostgreSQL Database Persistence & Idempotency
// ==============================================================================

/**
 * Persists deterministic novelty assessment into PostgreSQL relational tables.
 * Idempotent: re-running updates existing NoveltyAssessment and replaces child references.
 */
export async function persistNoveltyAssessment(
  analysisRunId: string,
  result: DeterministicNoveltyResult,
  groqExplanation?: string
) {
  // Map PatentabilityRisk to Prisma RiskLevel enum
  let prismaPatentabilityRisk: RiskLevel = RiskLevel.MEDIUM;
  if (result.patentabilityRisk === 'LOW') prismaPatentabilityRisk = RiskLevel.LOW;
  else if (result.patentabilityRisk === 'HIGH') prismaPatentabilityRisk = RiskLevel.HIGH;
  else prismaPatentabilityRisk = RiskLevel.MEDIUM;

  // 1. Upsert NoveltyAssessment parent record
  const assessment = await prisma.noveltyAssessment.upsert({
    where: { analysisRunId },
    update: {
      noveltyScore: result.noveltyScore,
      noveltyBand: result.noveltyBand,
      evidenceConfidence: result.evidenceConfidence,
      singleReferenceRisk: result.singleReferenceRisk,
      collectiveCoverage: result.collectiveCoverage,
      patentabilityRisk: prismaPatentabilityRisk,
      scoringBreakdown: result.scoringBreakdown as any,
      evidenceReferences: result.evidenceReferences as any,
      groqExplanation: groqExplanation || null,
      updatedAt: new Date(),
    },
    create: {
      analysisRunId,
      noveltyScore: result.noveltyScore,
      noveltyBand: result.noveltyBand,
      evidenceConfidence: result.evidenceConfidence,
      singleReferenceRisk: result.singleReferenceRisk,
      collectiveCoverage: result.collectiveCoverage,
      patentabilityRisk: prismaPatentabilityRisk,
      scoringBreakdown: result.scoringBreakdown as any,
      evidenceReferences: result.evidenceReferences as any,
      groqExplanation: groqExplanation || null,
    },
  });

  // 2. Synchronize child reference assessments idempotently
  const currentDocIds = result.referenceAssessments.map((r) => r.priorArtDocumentId);
  await prisma.noveltyReferenceAssessment.deleteMany({
    where: {
      noveltyAssessmentId: assessment.id,
      priorArtDocumentId: { notIn: currentDocIds },
    },
  });

  for (const ref of result.referenceAssessments) {
    await prisma.noveltyReferenceAssessment.upsert({
      where: {
        noveltyAssessmentId_priorArtDocumentId: {
          noveltyAssessmentId: assessment.id,
          priorArtDocumentId: ref.priorArtDocumentId,
        },
      },
      update: {
        disclosedFeatureCount: ref.disclosedFeatureCount,
        partialFeatureCount: ref.partialFeatureCount,
        notDisclosedFeatureCount: ref.notDisclosedFeatureCount,
        insufficientEvidenceCount: ref.insufficientEvidenceCount,
        coverageRatio: ref.coverageRatio,
        evidenceConfidence: ref.evidenceConfidence,
        anticipationRisk: ref.anticipationRisk,
        evidenceDetails: ref.evidenceDetails as any,
      },
      create: {
        noveltyAssessmentId: assessment.id,
        priorArtDocumentId: ref.priorArtDocumentId,
        disclosedFeatureCount: ref.disclosedFeatureCount,
        partialFeatureCount: ref.partialFeatureCount,
        notDisclosedFeatureCount: ref.notDisclosedFeatureCount,
        insufficientEvidenceCount: ref.insufficientEvidenceCount,
        coverageRatio: ref.coverageRatio,
        evidenceConfidence: ref.evidenceConfidence,
        anticipationRisk: ref.anticipationRisk,
        evidenceDetails: ref.evidenceDetails as any,
      },
    });
  }

  // 3. Synchronize AnalysisRun top-level fields
  await prisma.analysisRun.update({
    where: { id: analysisRunId },
    data: {
      noveltyScore: result.noveltyScore,
      patentabilityScore: Math.round(result.noveltyScore * 0.9 + 5),
      priorArtRisk: prismaPatentabilityRisk,
    },
  });

  return assessment;
}

/**
 * Retrieves complete persisted Novelty Assessment for an AnalysisRun.
 */
export async function getNoveltyAssessmentForAnalysis(analysisRunId: string) {
  return await prisma.noveltyAssessment.findUnique({
    where: { analysisRunId },
    include: {
      referenceAssessments: {
        include: {
          priorArtDocument: {
            select: {
              id: true,
              publicationNumber: true,
              title: true,
              jurisdiction: true,
              publicationDate: true,
            },
          },
        },
        orderBy: {
          coverageRatio: 'desc',
        },
      },
    },
  });
}

/**
 * Validates evidence provenance: ensures all cited prior art documents and features
 * belong strictly to the current AnalysisRun context and rejects invalid cross-analysis references.
 */
export async function validateNoveltyEvidenceProvenance(analysisRunId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const assessment = await getNoveltyAssessmentForAnalysis(analysisRunId);
  if (!assessment) {
    return { valid: false, errors: [`No NoveltyAssessment found for analysisRunId "${analysisRunId}"`] };
  }

  // 1. Fetch authentic analysis context
  const allowedMatches = await prisma.priorArtMatch.findMany({
    where: { analysisRunId },
    select: { priorArtDocId: true },
  });
  const allowedDocIds = new Set(allowedMatches.map((m) => m.priorArtDocId));

  const allowedFeatures = await prisma.inventionFeature.findMany({
    where: { analysisRunId },
    select: { featureKey: true, id: true },
  });
  const allowedFeatureKeys = new Set(allowedFeatures.map((f) => f.featureKey));

  // 2. Validate referenceAssessments
  for (const ref of assessment.referenceAssessments) {
    if (!allowedDocIds.has(ref.priorArtDocumentId)) {
      errors.push(
        `ReferenceAssessment cites unauthorized cross-analysis or unknown priorArtDocumentId "${ref.priorArtDocumentId}"`
      );
    }
  }

  // 3. Validate evidenceReferences JSON
  const evidenceRefs = (assessment.evidenceReferences as any[]) || [];
  for (const ev of evidenceRefs) {
    if (ev.priorArtDocumentId && !allowedDocIds.has(ev.priorArtDocumentId)) {
      errors.push(
        `EvidenceReference cites unauthorized priorArtDocumentId "${ev.priorArtDocumentId}"`
      );
    }
    if (ev.featureKey && !allowedFeatureKeys.has(ev.featureKey)) {
      errors.push(
        `EvidenceReference cites unknown featureKey "${ev.featureKey}"`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

