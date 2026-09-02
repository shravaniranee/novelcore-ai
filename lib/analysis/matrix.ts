import { prisma } from '@/lib/prisma';
import { OverlapStatus } from '@prisma/client';

export type OverlapStatusType = 'DISCLOSED' | 'PARTIAL' | 'NOT_DISCLOSED' | 'INSUFFICIENT_EVIDENCE';

export interface MatrixEntryInput {
  inventionId: string;
  analysisRunId: string;
  priorArtDocumentId: string;
  featureId: string;
  overlapStatus: OverlapStatusType;
  evidence: string;
  evidenceSource?: string | null;
  featureName?: string | null;
  featureDescription?: string | null;
  explanation?: string | null;
  featureRecordId?: string | null;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description?: string;
  isNoveltyCandidate?: boolean;
}

export interface PatentMetadata {
  id: string; // priorArtDocument UUID
  publicationNumber: string;
  title: string;
  ranking?: number;
  similarityScore?: number;
}

export interface FeatureCoveragePerPatent {
  priorArtDocumentId: string;
  publicationNumber?: string;
  patentTitle?: string;
  ranking?: number;
  totalDisclosed: number;
  totalPartial: number;
  totalNotDisclosed: number;
  totalInsufficient: number;
  totalFeatures: number;
  coverageRatio: number; // 0.0 to 1.0
  coveragePercentage: number; // 0 to 100
}

export interface PatentCoveragePerFeature {
  featureId: string;
  featureName?: string;
  featureDescription?: string;
  disclosedByPatents: string[];
  partiallyDisclosedByPatents: string[];
  notDisclosedByPatents: string[];
  insufficientEvidenceByPatents: string[];
  isDisclosedAnywhere: boolean;
  isPartiallyDisclosedAnywhere: boolean;
  isUnique: boolean;
}

export interface MatrixSummaryStats {
  totalDisclosedFeatures: number;
  totalPartialFeatures: number;
  totalUniqueFeatures: number;
  totalEvaluatedFeatures: number;
  averagePatentCoverage: number;
}

export interface StructuredMatrixView {
  analysisRunId: string;
  inventionId: string;
  dimensions: {
    rows: number; // number of prior art patents
    columns: number; // number of features
    totalCells: number;
  };
  features: FeatureDefinition[];
  priorArtDocuments: PatentMetadata[];
  matrix: {
    priorArtDocumentId: string;
    publicationNumber?: string;
    featureId: string;
    featureName?: string;
    overlapStatus: OverlapStatusType;
    evidence: string;
    evidenceSource?: string | null;
    explanation?: string | null;
  }[];
  stats: {
    featureCoveragePerPatent: FeatureCoveragePerPatent[];
    patentCoveragePerFeature: PatentCoveragePerFeature[];
    summary: MatrixSummaryStats;
  };
}

// ------------------------------------------------------------------------------
// 1. VALIDATION
// ------------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that every matrix entry references an authentic prior art document
 * in the current analysis and an authentic technical feature extracted for the invention.
 */
export function validateMatrixEntries(
  entries: MatrixEntryInput[],
  validPatentDocIds: string[],
  validFeatureIds: string[]
): ValidationResult {
  const errors: string[] = [];
  const validPatentSet = new Set(validPatentDocIds);
  const validFeatureSet = new Set(validFeatureIds);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (!validPatentSet.has(entry.priorArtDocumentId)) {
      errors.push(
        `Entry #${i + 1}: Invalid priorArtDocumentId "${entry.priorArtDocumentId}". Must be one of the analysis candidates: [${Array.from(
          validPatentSet
        ).join(', ')}]`
      );
    }

    if (!validFeatureSet.has(entry.featureId)) {
      errors.push(
        `Entry #${i + 1}: Invalid featureId "${entry.featureId}". Must be one of the invention features: [${Array.from(
          validFeatureSet
        ).join(', ')}]`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ------------------------------------------------------------------------------
// 2. DETERMINISTIC ORDERING HELPERS
// ------------------------------------------------------------------------------

/**
 * Sorts features deterministically by numeric identifier (e.g. F1, F2, F10) or alphabetical order.
 */
export function sortFeaturesDeterministically<T extends { id: string }>(features: T[]): T[] {
  return [...features].sort((a, b) => {
    const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10);
    const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Sorts prior art documents deterministically by ranking ascending, then publication number.
 */
export function sortPatentsDeterministically<T extends { id: string; publicationNumber?: string; ranking?: number }>(
  patents: T[]
): T[] {
  return [...patents].sort((a, b) => {
    const rankA = a.ranking ?? 999;
    const rankB = b.ranking ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const pubA = a.publicationNumber || a.id;
    const pubB = b.publicationNumber || b.id;
    return pubA.localeCompare(pubB);
  });
}

// ------------------------------------------------------------------------------
// 3. SCORING SUPPORT UTILITIES
// ------------------------------------------------------------------------------

/**
 * Calculates feature coverage metrics for each patent in the matrix.
 * Note: Does not assign or modify final novelty scores.
 */
export function calculateFeatureCoveragePerPatent(
  entries: MatrixEntryInput[],
  patents: PatentMetadata[],
  featuresCount: number
): FeatureCoveragePerPatent[] {
  const sortedPatents = sortPatentsDeterministically(patents);

  // Group entries by priorArtDocumentId
  const entriesByPatent = new Map<string, MatrixEntryInput[]>();
  for (const entry of entries) {
    const list = entriesByPatent.get(entry.priorArtDocumentId) || [];
    list.push(entry);
    entriesByPatent.set(entry.priorArtDocumentId, list);
  }

  const result: FeatureCoveragePerPatent[] = [];
  const denominator = Math.max(1, featuresCount);

  for (const patent of sortedPatents) {
    const patentEntries = entriesByPatent.get(patent.id) || [];
    let disclosed = 0;
    let partial = 0;
    let notDisclosed = 0;
    let insufficient = 0;

    for (const e of patentEntries) {
      if (e.overlapStatus === 'DISCLOSED') disclosed++;
      else if (e.overlapStatus === 'PARTIAL') partial++;
      else if (e.overlapStatus === 'NOT_DISCLOSED') notDisclosed++;
      else if (e.overlapStatus === 'INSUFFICIENT_EVIDENCE') insufficient++;
    }

    const coverageRatio = Math.min(1.0, Math.max(0.0, (disclosed + 0.5 * partial) / denominator));
    const coveragePercentage = Math.round(coverageRatio * 1000) / 10;

    result.push({
      priorArtDocumentId: patent.id,
      publicationNumber: patent.publicationNumber,
      patentTitle: patent.title,
      ranking: patent.ranking,
      totalDisclosed: disclosed,
      totalPartial: partial,
      totalNotDisclosed: notDisclosed,
      totalInsufficient: insufficient,
      totalFeatures: denominator,
      coverageRatio,
      coveragePercentage,
    });
  }

  return result;
}

/**
 * Calculates patent coverage metrics for each feature in the invention.
 * Note: Does not assign or modify final novelty scores.
 */
export function calculatePatentCoveragePerFeature(
  entries: MatrixEntryInput[],
  features: FeatureDefinition[],
  patents: PatentMetadata[]
): PatentCoveragePerFeature[] {
  const sortedFeatures = sortFeaturesDeterministically(features);
  const patentPubMap = new Map<string, string>(patents.map((p) => [p.id, p.publicationNumber || p.id]));

  // Group entries by featureId
  const entriesByFeature = new Map<string, MatrixEntryInput[]>();
  for (const entry of entries) {
    const list = entriesByFeature.get(entry.featureId) || [];
    list.push(entry);
    entriesByFeature.set(entry.featureId, list);
  }

  const result: PatentCoveragePerFeature[] = [];

  for (const feat of sortedFeatures) {
    const featEntries = entriesByFeature.get(feat.id) || [];
    const disclosed: string[] = [];
    const partial: string[] = [];
    const notDisclosed: string[] = [];
    const insufficient: string[] = [];

    for (const e of featEntries) {
      const pub = patentPubMap.get(e.priorArtDocumentId) || e.priorArtDocumentId;
      if (e.overlapStatus === 'DISCLOSED') disclosed.push(pub);
      else if (e.overlapStatus === 'PARTIAL') partial.push(pub);
      else if (e.overlapStatus === 'NOT_DISCLOSED') notDisclosed.push(pub);
      else if (e.overlapStatus === 'INSUFFICIENT_EVIDENCE') insufficient.push(pub);
    }

    const isDisclosedAnywhere = disclosed.length > 0;
    const isPartiallyDisclosedAnywhere = !isDisclosedAnywhere && partial.length > 0;
    const isUnique = !isDisclosedAnywhere && partial.length === 0;

    result.push({
      featureId: feat.id,
      featureName: feat.name,
      featureDescription: feat.description,
      disclosedByPatents: disclosed,
      partiallyDisclosedByPatents: partial,
      notDisclosedByPatents: notDisclosed,
      insufficientEvidenceByPatents: insufficient,
      isDisclosedAnywhere,
      isPartiallyDisclosedAnywhere,
      isUnique,
    });
  }

  return result;
}

/**
 * Calculates aggregate summary statistics across the entire matrix:
 * total disclosed features, total partial features, and total unique/undisclosed features.
 */
export function calculateMatrixSummaryStats(
  patentCoverage: PatentCoveragePerFeature[],
  featureCoverage: FeatureCoveragePerPatent[]
): MatrixSummaryStats {
  let disclosedCount = 0;
  let partialCount = 0;
  let uniqueCount = 0;

  for (const f of patentCoverage) {
    if (f.isDisclosedAnywhere) {
      disclosedCount++;
    } else if (f.isPartiallyDisclosedAnywhere) {
      partialCount++;
    } else if (f.isUnique) {
      uniqueCount++;
    }
  }

  const avgCoverage =
    featureCoverage.length > 0
      ? Math.round(
          (featureCoverage.reduce((acc, c) => acc + c.coveragePercentage, 0) / featureCoverage.length) * 10
        ) / 10
      : 0;

  return {
    totalDisclosedFeatures: disclosedCount,
    totalPartialFeatures: partialCount,
    totalUniqueFeatures: uniqueCount,
    totalEvaluatedFeatures: patentCoverage.length,
    averagePatentCoverage: avgCoverage,
  };
}

// ------------------------------------------------------------------------------
// 4. DATABASE PERSISTENCE WITH DUPLICATE PREVENTION
// ------------------------------------------------------------------------------

/**
 * Persists matrix entries to PostgreSQL with strict duplicate prevention.
 * Uses Prisma upsert on the compound unique constraint @@unique([analysisRunId, priorArtDocumentId, featureId]).
 */
export async function persistFeatureOverlapMatrix(
  entries: MatrixEntryInput[]
): Promise<number> {
  if (!entries || entries.length === 0) {
    return 0;
  }

  let savedCount = 0;

  for (const entry of entries) {
    await prisma.featureOverlapMatrixEntry.upsert({
      where: {
        analysisRunId_priorArtDocumentId_featureId: {
          analysisRunId: entry.analysisRunId,
          priorArtDocumentId: entry.priorArtDocumentId,
          featureId: entry.featureId,
        },
      },
      update: {
        overlapStatus: entry.overlapStatus as OverlapStatus,
        evidence: entry.evidence,
        evidenceSource: entry.evidenceSource || null,
        featureName: entry.featureName || null,
        featureDescription: entry.featureDescription || null,
        explanation: entry.explanation || null,
        featureRecordId: entry.featureRecordId || null,
      },
      create: {
        inventionId: entry.inventionId,
        analysisRunId: entry.analysisRunId,
        priorArtDocumentId: entry.priorArtDocumentId,
        featureId: entry.featureId,
        overlapStatus: entry.overlapStatus as OverlapStatus,
        evidence: entry.evidence,
        evidenceSource: entry.evidenceSource || null,
        featureName: entry.featureName || null,
        featureDescription: entry.featureDescription || null,
        explanation: entry.explanation || null,
        featureRecordId: entry.featureRecordId || null,
      },
    });
    savedCount++;
  }

  return savedCount;
}

// ------------------------------------------------------------------------------
// 5. RETRIEVAL & STRUCTURED MATRIX ASSEMBLY
// ------------------------------------------------------------------------------

/**
 * Retrieves the persisted feature overlap matrix for an analysis run and formats it
 * into a complete structured JSON representation with deterministic ordering and metrics.
 */
export async function getFeatureOverlapMatrixForAnalysis(
  analysisRunId: string
): Promise<StructuredMatrixView | null> {
  const analysisRun = await prisma.analysisRun.findUnique({
    where: { id: analysisRunId },
    include: {
      invention: true,
      priorArtMatches: {
        include: { document: true },
        orderBy: { ranking: 'asc' },
      },
      featureOverlapEntries: {
        include: { priorArtDocument: true },
      },
    },
  });

  if (!analysisRun) {
    return null;
  }

  // Assemble prior art document metadata list
  const patents: PatentMetadata[] = analysisRun.priorArtMatches.map((m) => ({
    id: m.priorArtDocId,
    publicationNumber: m.document.publicationNumber,
    title: m.document.title,
    ranking: m.ranking,
    similarityScore: m.similarityScore,
  }));

  // Deduplicate features from the matrix entries or concepts
  const featureMap = new Map<string, FeatureDefinition>();
  for (const entry of analysisRun.featureOverlapEntries) {
    if (!featureMap.has(entry.featureId)) {
      featureMap.set(entry.featureId, {
        id: entry.featureId,
        name: entry.featureName || entry.featureId,
        description: entry.featureDescription || undefined,
      });
    }
  }

  const features = sortFeaturesDeterministically(Array.from(featureMap.values()));
  const sortedPatents = sortPatentsDeterministically(patents);

  // Convert DB entries to MatrixEntryInput
  const entries: MatrixEntryInput[] = analysisRun.featureOverlapEntries.map((e) => ({
    inventionId: e.inventionId,
    analysisRunId: e.analysisRunId,
    priorArtDocumentId: e.priorArtDocumentId,
    featureId: e.featureId,
    overlapStatus: e.overlapStatus as OverlapStatusType,
    evidence: e.evidence,
    evidenceSource: e.evidenceSource,
    featureName: e.featureName,
    featureDescription: e.featureDescription,
    explanation: e.explanation,
  }));

  // Calculate stats
  const featureCoverage = calculateFeatureCoveragePerPatent(entries, sortedPatents, features.length);
  const patentCoverage = calculatePatentCoveragePerFeature(entries, features, sortedPatents);
  const summary = calculateMatrixSummaryStats(patentCoverage, featureCoverage);

  // Assemble deterministic cells array (sorted by patent rank, then feature id)
  const patentOrder = new Map(sortedPatents.map((p, idx) => [p.id, idx]));
  const featureOrder = new Map(features.map((f, idx) => [f.id, idx]));
  const patentPubMap = new Map(sortedPatents.map((p) => [p.id, p.publicationNumber]));

  const sortedCells = [...entries].sort((a, b) => {
    const pA = patentOrder.get(a.priorArtDocumentId) ?? 999;
    const pB = patentOrder.get(b.priorArtDocumentId) ?? 999;
    if (pA !== pB) return pA - pB;
    const fA = featureOrder.get(a.featureId) ?? 999;
    const fB = featureOrder.get(b.featureId) ?? 999;
    return fA - fB;
  });

  return {
    analysisRunId: analysisRun.id,
    inventionId: analysisRun.inventionId,
    dimensions: {
      rows: sortedPatents.length,
      columns: features.length,
      totalCells: sortedCells.length,
    },
    features,
    priorArtDocuments: sortedPatents,
    matrix: sortedCells.map((c) => ({
      priorArtDocumentId: c.priorArtDocumentId,
      publicationNumber: patentPubMap.get(c.priorArtDocumentId) || c.priorArtDocumentId,
      featureId: c.featureId,
      featureName: c.featureName || undefined,
      overlapStatus: c.overlapStatus,
      evidence: c.evidence,
      evidenceSource: c.evidenceSource,
      explanation: c.explanation,
    })),
    stats: {
      featureCoveragePerPatent: featureCoverage,
      patentCoveragePerFeature: patentCoverage,
      summary,
    },
  };
}
