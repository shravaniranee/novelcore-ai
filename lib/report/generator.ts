/**
 * NovelCore AI — Phase 11: Unified Patent Intelligence Report Generator
 *
 * Aggregation / orchestration layer only. Does NOT recalculate novelty, overlap,
 * claims, or examiner metrics. Loads persisted AnalysisRun evidence, validates
 * cross-analysis isolation, assembles structured sections, optionally polishes
 * narrative with Groq, and persists idempotently (one report per AnalysisRun).
 */

import { prisma } from '@/lib/prisma';
import { isGroqConfigured, generateStructuredCompletion } from '@/lib/ai/groq';
import { z } from 'zod';

// ==============================================================================
// Types
// ==============================================================================

export type ReportFinalRecommendation =
  | 'STRONG_DIFFERENTIATION_OPPORTUNITY'
  | 'MODERATE_DIFFERENTIATION_OPPORTUNITY'
  | 'SIGNIFICANT_PRIOR_ART_OVERLAP'
  | 'INSUFFICIENT_EVIDENCE';

export type EvidenceSourceType =
  | 'INVENTION'
  | 'INVENTION_FEATURE'
  | 'PRIOR_ART'
  | 'OVERLAP_ENTRY'
  | 'NOVELTY_ASSESSMENT'
  | 'NOVELTY_REFERENCE'
  | 'INNOVATION_OPPORTUNITY'
  | 'ANALYSIS_OPPORTUNITY'
  | 'CLAIM'
  | 'CLAIM_VERSION'
  | 'CLAIM_ELEMENT'
  | 'EXAMINER_REVIEW'
  | 'EXAMINER_FINDING';

export type ReportSectionKey =
  | 'EXECUTIVE_SUMMARY'
  | 'INVENTION'
  | 'FEATURES'
  | 'PRIOR_ART'
  | 'OVERLAP'
  | 'NOVELTY'
  | 'INNOVATION'
  | 'DIFFERENTIATION'
  | 'CLAIMS'
  | 'EXAMINER'
  | 'EVIDENCE'
  | 'RISKS'
  | 'RECOMMENDATION'
  | 'DISCLAIMER';

export interface EvidenceSourceRef {
  sourceType: EvidenceSourceType;
  sourceId: string;
  analysisRunId: string;
  sectionKey: ReportSectionKey;
  publicationNumber?: string;
  title?: string;
  featureKey?: string;
  elementKey?: string;
  claimNumber?: number;
  opportunityKey?: string;
  description?: string;
}

/** Exact Phase 11 educational / legal disclaimer (STEP 28). */
export const LEGAL_DISCLAIMER =
  'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. AI-assisted patent intelligence and examiner simulation are evidence-based heuristics and are not an actual patent examination or legal opinion.';

/** Zod contract for persisted sectionsSnapshot (validated structured snapshot; not ReportSection rows). */
export const unifiedReportSectionsSchema = z.object({
  executiveSummary: z.object({
    structured: z.record(z.any()),
    text: z.string(),
  }),
  inventionOverview: z.record(z.any()),
  technicalFeatures: z.array(z.any()),
  priorArtLandscape: z.array(z.any()),
  priorArtRanking: z.array(z.any()),
  featureOverlapMatrix: z.array(z.any()),
  noveltyAssessment: z.record(z.any()),
  innovationGapAnalysis: z.record(z.any()),
  differentiationAnalysis: z.record(z.any()),
  claimStrategy: z.record(z.any()),
  claimVulnerability: z.record(z.any()),
  examinerSimulation: z.record(z.any()),
  evidenceTraceability: z.object({
    sources: z.array(z.any()),
    note: z.string(),
  }),
  risksAndLimitations: z.object({
    items: z.array(z.string()),
  }),
  finalRecommendation: z.object({
    code: z.string(),
    narrative: z.string(),
    reason: z.string().optional(),
  }),
  educationalLegalDisclaimer: z.string(),
});

export type UnifiedReportSections = z.infer<typeof unifiedReportSectionsSchema>;

const RRF_FROM_EXPLANATION = /RRF\s*Score:\s*([0-9.]+)/i;

// ==============================================================================
// Helpers
// ==============================================================================

function parseRrfFromExplanation(explanation: string | null | undefined): number | null {
  if (!explanation) return null;
  const m = explanation.match(RRF_FROM_EXPLANATION);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function emptyState(message: string) {
  return { available: false as const, message };
}

export function deriveFinalRecommendation(input: {
  priorArtCount: number;
  noveltyScore: number | null;
  maxSingleCoverage: number | null;
  collectiveCoverage: number | null;
  opportunityCount: number;
  maxDifferentiationScore: number | null;
  examinerOverallRisk: string | null;
}): ReportFinalRecommendation {
  const {
    priorArtCount,
    noveltyScore,
    maxSingleCoverage,
    collectiveCoverage,
    opportunityCount,
    maxDifferentiationScore,
    examinerOverallRisk,
  } = input;

  if (priorArtCount === 0 && noveltyScore === null && opportunityCount === 0) {
    return 'INSUFFICIENT_EVIDENCE';
  }

  if (
    (typeof maxSingleCoverage === 'number' && maxSingleCoverage >= 0.7) ||
    (typeof collectiveCoverage === 'number' && collectiveCoverage >= 0.85) ||
    examinerOverallRisk === 'CRITICAL' ||
    examinerOverallRisk === 'HIGH'
  ) {
    return 'SIGNIFICANT_PRIOR_ART_OVERLAP';
  }

  if (
    opportunityCount > 0 &&
    typeof maxDifferentiationScore === 'number' &&
    maxDifferentiationScore >= 70 &&
    (noveltyScore === null || noveltyScore >= 55)
  ) {
    return 'STRONG_DIFFERENTIATION_OPPORTUNITY';
  }

  if (opportunityCount > 0 || (noveltyScore !== null && noveltyScore >= 45)) {
    return 'MODERATE_DIFFERENTIATION_OPPORTUNITY';
  }

  if (priorArtCount === 0) {
    return 'INSUFFICIENT_EVIDENCE';
  }

  return 'MODERATE_DIFFERENTIATION_OPPORTUNITY';
}

export function recommendationNarrative(
  recommendation: ReportFinalRecommendation,
  inventionTitle: string
): string {
  const base =
    'Based on the available evidence, the analysis indicates the following overall assessment. Professional patent review is recommended.';

  switch (recommendation) {
    case 'STRONG_DIFFERENTIATION_OPPORTUNITY':
      return `${base} For "${inventionTitle}", evidence suggests a strong differentiation opportunity relative to the cited prior-art landscape. This is an evidence-based indicator, not a guarantee of patentability.`;
    case 'MODERATE_DIFFERENTIATION_OPPORTUNITY':
      return `${base} For "${inventionTitle}", evidence suggests a moderate differentiation opportunity. Further claim refinement and professional review are advisable.`;
    case 'SIGNIFICANT_PRIOR_ART_OVERLAP':
      return `${base} For "${inventionTitle}", evidence indicates significant prior-art overlap and elevated risk indicators. Narrowing claim scope and attorney review are recommended.`;
    case 'INSUFFICIENT_EVIDENCE':
    default:
      return `${base} For "${inventionTitle}", available evidence is insufficient to support a stronger differentiation or overlap conclusion.`;
  }
}

export function recommendationReasonText(
  recommendation: ReportFinalRecommendation,
  context: {
    priorArtCount: number;
    noveltyScore: number | null;
    maxSingleCoverage: number | null;
    opportunityCount: number;
    examinerOverallRisk: string | null;
  }
): string {
  return [
    `Deterministic recommendation code: ${recommendation}.`,
    `Prior-art references: ${context.priorArtCount}.`,
    `Novelty indicator: ${context.noveltyScore === null ? 'Insufficient evidence' : context.noveltyScore}.`,
    `Max single-reference coverage: ${context.maxSingleCoverage === null ? 'Insufficient evidence' : context.maxSingleCoverage}.`,
    `Innovation opportunities: ${context.opportunityCount}.`,
    `Examiner overall risk: ${context.examinerOverallRisk ?? 'Examiner simulation has not been run.'}.`,
    'Derived only from persisted AnalysisRun evidence; not a legal conclusion.',
  ].join(' ');
}

export function buildDeterministicExecutiveSummary(params: {
  inventionTitle: string;
  analysisRunId: string;
  featureCount: number;
  priorArtCount: number;
  claimCount: number;
  latestClaimVersions: Array<{ claimNumber: number; versionNumber: number }>;
  noveltyScore: number | null;
  evidenceConfidence: number | null;
  opportunityCount: number;
  maxDifferentiationScore: number | null;
  examinerFindingCount: number | null;
  examinerOverallRisk: string | null;
  claimVulnerability: string | null;
  overallEvidenceConfidence: number | null;
  finalRecommendation: ReportFinalRecommendation;
}): string {
  const {
    inventionTitle,
    analysisRunId,
    featureCount,
    priorArtCount,
    claimCount,
    latestClaimVersions,
    noveltyScore,
    evidenceConfidence,
    opportunityCount,
    maxDifferentiationScore,
    examinerFindingCount,
    examinerOverallRisk,
    claimVulnerability,
    overallEvidenceConfidence,
    finalRecommendation,
  } = params;

  const versionLine =
    latestClaimVersions.length > 0
      ? latestClaimVersions
          .map((v) => `Claim ${v.claimNumber} v${v.versionNumber}`)
          .join(', ')
      : 'No claims generated for this analysis.';

  return [
    `Unified Patent Intelligence Report for "${inventionTitle}" (AnalysisRun ${analysisRunId}).`,
    `Technical features: ${featureCount}. Prior-art references: ${priorArtCount}. Claims: ${claimCount}.`,
    `Latest claim versions: ${versionLine}.`,
    `Novelty indicator: ${noveltyScore === null ? 'Insufficient evidence' : noveltyScore}.`,
    `Novelty evidence confidence: ${evidenceConfidence === null ? 'Insufficient evidence' : evidenceConfidence}.`,
    `Innovation opportunities: ${opportunityCount}.`,
    `Differentiation indicator: ${maxDifferentiationScore === null ? 'Insufficient evidence' : maxDifferentiationScore}.`,
    `Examiner findings: ${examinerFindingCount === null ? 'Examiner simulation has not been run.' : examinerFindingCount}.`,
    `Examiner overall risk: ${examinerOverallRisk ?? 'Examiner simulation has not been run.'}.`,
    `Claim vulnerability indicator: ${claimVulnerability ?? 'Insufficient evidence'}.`,
    `Overall evidence confidence: ${overallEvidenceConfidence === null ? 'Insufficient evidence' : overallEvidenceConfidence}.`,
    `Final recommendation code: ${finalRecommendation}.`,
    LEGAL_DISCLAIMER,
  ].join(' ');
}

// ==============================================================================
// Cross-analysis isolation
// ==============================================================================

export function validateReportCrossAnalysisIsolation(input: {
  analysisRunId: string;
  inventionId: string;
  featureRunIds: string[];
  featureInventionIds: string[];
  matchRunIds: string[];
  overlapRunIds: string[];
  noveltyRunId: string | null;
  opportunityRunIds: Array<string | null>;
  claimRunIds: Array<string | null>;
  claimElementFeatureRunIds: Array<string | null>;
  examinerRunIds: Array<string | null>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { analysisRunId, inventionId } = input;

  for (const id of input.featureRunIds) {
    if (id !== analysisRunId) errors.push(`InventionFeature belongs to foreign AnalysisRun "${id}".`);
  }
  for (const id of input.featureInventionIds) {
    if (id !== inventionId) errors.push(`InventionFeature belongs to foreign Invention "${id}".`);
  }
  for (const id of input.matchRunIds) {
    if (id !== analysisRunId) errors.push(`PriorArtMatch belongs to foreign AnalysisRun "${id}".`);
  }
  for (const id of input.overlapRunIds) {
    if (id !== analysisRunId) errors.push(`Overlap entry belongs to foreign AnalysisRun "${id}".`);
  }
  if (input.noveltyRunId && input.noveltyRunId !== analysisRunId) {
    errors.push(`NoveltyAssessment belongs to foreign AnalysisRun "${input.noveltyRunId}".`);
  }
  for (const id of input.opportunityRunIds) {
    if (id && id !== analysisRunId) errors.push(`Opportunity belongs to foreign AnalysisRun "${id}".`);
  }
  for (const id of input.claimRunIds) {
    if (id && id !== analysisRunId) errors.push(`Claim belongs to foreign AnalysisRun "${id}".`);
  }
  for (const id of input.claimElementFeatureRunIds) {
    if (id && id !== analysisRunId) {
      errors.push(`ClaimElement feature belongs to foreign AnalysisRun "${id}".`);
    }
  }
  for (const id of input.examinerRunIds) {
    if (id && id !== analysisRunId) errors.push(`ExaminerReview belongs to foreign AnalysisRun "${id}".`);
  }

  return { valid: errors.length === 0, errors };
}

function assertEvidenceSourcesBelongToRun(
  sources: EvidenceSourceRef[],
  analysisRunId: string
): void {
  for (const s of sources) {
    if (s.analysisRunId !== analysisRunId) {
      throw new Error(
        `Evidence source "${s.sourceId}" (${s.sourceType}) does not belong to AnalysisRun "${analysisRunId}".`
      );
    }
  }
}

// ==============================================================================
// Groq narrative polish (optional)
// ==============================================================================

const groqSummarySchema = z.object({
  executiveSummary: z.string().min(20).max(4000),
  overallAssessment: z.string().min(20).max(4000),
});

export async function polishReportNarrativeWithGroq(input: {
  deterministicExecutiveSummary: string;
  overallAssessment: string;
  inventionTitle: string;
  finalRecommendation: ReportFinalRecommendation;
}): Promise<{
  executiveSummary: string;
  overallAssessment: string;
  provenance: 'DETERMINISTIC' | 'GROQ_ASSISTED';
}> {
  const fallback = {
    executiveSummary: input.deterministicExecutiveSummary,
    overallAssessment: input.overallAssessment,
    provenance: 'DETERMINISTIC' as const,
  };

  // Prefer deterministic. Groq is optional; never retry (avoids wasting TPD quota).
  if (!isGroqConfigured()) {
    return fallback;
  }

  try {
    // One-shot only: use generateStructuredCompletion but catch immediately —
    // underlying withRetry still exists for other callers; we do NOT loop here
    // beyond a single invocation. If Groq fails, fall back instantly.
    const raw = await Promise.race([
      generateStructuredCompletion<{
        executiveSummary: string;
        overallAssessment: string;
      }>({
        systemPrompt:
          'You polish patent intelligence report wording only. Never invent scores, IDs, legal conclusions, or evidence. Preserve all numeric facts exactly. Do not claim patentability or grant outcomes.',
        prompt: JSON.stringify({
          inventionTitle: input.inventionTitle,
          finalRecommendation: input.finalRecommendation,
          deterministicExecutiveSummary: input.deterministicExecutiveSummary,
          overallAssessment: input.overallAssessment,
          rules: [
            'Rewrite for readability only',
            'Keep all metrics unchanged',
            'Do not add legal conclusions',
            'Keep the educational disclaimer intent',
          ],
        }),
        temperature: 0.1,
        maxTokens: 2000,
        jsonSchema: {
          name: 'report_narrative_polish',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['executiveSummary', 'overallAssessment'],
            properties: {
              executiveSummary: { type: 'string' },
              overallAssessment: { type: 'string' },
            },
          },
        },
      }),
      // Hard 8s ceiling so report generation never hangs on Groq
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Groq report polish timed out')), 8000)
      ),
    ]);

    const parsed = groqSummarySchema.safeParse(raw);
    if (!parsed.success) {
      return fallback;
    }

    return {
      executiveSummary: parsed.data.executiveSummary,
      overallAssessment: parsed.data.overallAssessment,
      provenance: 'GROQ_ASSISTED',
    };
  } catch {
    return fallback;
  }
}

// ==============================================================================
// Assembly
// ==============================================================================

export async function assembleUnifiedReport(analysisRunId: string) {
  const run = await prisma.analysisRun.findUnique({
    where: { id: analysisRunId },
    include: {
      invention: true,
      inventionFeatures: { orderBy: { order: 'asc' } },
      priorArtMatches: {
        orderBy: { ranking: 'asc' },
        include: { document: true },
      },
      featureOverlapEntries: {
        orderBy: [{ priorArtDocumentId: 'asc' }, { featureId: 'asc' }],
        include: { priorArtDocument: true },
      },
      noveltyAssessment: {
        include: {
          referenceAssessments: {
            include: { priorArtDocument: true },
            orderBy: { coverageRatio: 'desc' },
          },
        },
      },
      opportunities: { orderBy: { differentiationScore: 'desc' } },
      claims: {
        orderBy: { claimNumber: 'asc' },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              elements: {
                orderBy: { order: 'asc' },
                include: { inventionFeature: true },
              },
            },
          },
        },
      },
      examinerReviews: {
        where: { analysisRunId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          findings: {
            orderBy: [{ claimNumber: 'asc' }, { severity: 'desc' }],
          },
        },
      },
    },
  });

  if (!run) {
    throw new Error(`AnalysisRun "${analysisRunId}" not found.`);
  }

  const invention = run.invention;
  const features = run.inventionFeatures;
  const matches = run.priorArtMatches;
  const overlaps = run.featureOverlapEntries;
  const novelty = run.noveltyAssessment;
  const opportunities = run.opportunities;
  const claims = run.claims;
  const examinerReview = run.examinerReviews[0] || null;

  const isolation = validateReportCrossAnalysisIsolation({
    analysisRunId: run.id,
    inventionId: invention.id,
    featureRunIds: features.map((f) => f.analysisRunId),
    featureInventionIds: features.map((f) => f.inventionId),
    matchRunIds: matches.map((m) => m.analysisRunId),
    overlapRunIds: overlaps.map((o) => o.analysisRunId),
    noveltyRunId: novelty?.analysisRunId ?? null,
    opportunityRunIds: opportunities.map((o) => o.analysisRunId),
    claimRunIds: claims.map((c) => c.analysisRunId),
    claimElementFeatureRunIds: claims.flatMap((c) =>
      (c.versions[0]?.elements || []).map((e) => e.inventionFeature?.analysisRunId ?? null)
    ),
    examinerRunIds: examinerReview ? [examinerReview.analysisRunId] : [],
  });

  if (!isolation.valid) {
    throw new Error(`Cross-analysis isolation failed: ${isolation.errors.join(' ')}`);
  }

  const evidenceSources: EvidenceSourceRef[] = [];

  evidenceSources.push({
    sourceType: 'INVENTION',
    sourceId: invention.id,
    analysisRunId: run.id,
    sectionKey: 'INVENTION',
    title: invention.title,
    description: invention.title,
  });

  const technicalFeatures = features.map((f) => {
    evidenceSources.push({
      sourceType: 'INVENTION_FEATURE',
      sourceId: f.id,
      analysisRunId: run.id,
      sectionKey: 'FEATURES',
      featureKey: f.featureKey,
      title: f.name,
      description: f.name,
    });
    return {
      id: f.id,
      featureKey: f.featureKey,
      name: f.name,
      description: f.description,
      order: f.order,
      source: f.source,
      isNovelty: f.isNovelty,
    };
  });

  const priorArtLandscape = matches.map((m) => {
    const doc = m.document;
    const rrfScore = parseRrfFromExplanation(m.explanation);
    evidenceSources.push({
      sourceType: 'PRIOR_ART',
      sourceId: doc.id,
      analysisRunId: run.id,
      sectionKey: 'PRIOR_ART',
      publicationNumber: doc.publicationNumber,
      title: doc.title,
      description: doc.title,
    });
    return {
      priorArtDocumentId: doc.id,
      publicationNumber: doc.publicationNumber,
      title: doc.title,
      abstract: doc.abstract,
      source: doc.source,
      jurisdiction: doc.jurisdiction,
      publicationDate: doc.publicationDate,
      technologyDomain:
        m.technologyDomain ||
        ((doc.metadata as any)?.technologyDomain as string | undefined) ||
        null,
      // Presentation similarity % derived from semantic similarity when available.
      // This is NOT an RRF score.
      presentationSimilarityPercent: m.similarityScore,
      semanticSimilarityLabel: 'presentationSimilarityPercent',
      finalRank: m.ranking,
      ranking: m.ranking,
      rrfScore,
      rrfScoreNote: 'RRF is a ranking fusion score, not a similarity score.',
      lexicalScore: null as number | null,
      lexicalRank: null as number | null,
      semanticDistance: null as number | null,
      semanticSimilarity: null as number | null,
      semanticRank: null as number | null,
      explanation: m.explanation,
      overlap: m.overlap,
      matchedConcepts: m.matchedConcepts,
    };
  });

  const featureOverlapMatrix = overlaps.map((o) => {
    evidenceSources.push({
      sourceType: 'OVERLAP_ENTRY',
      sourceId: o.id,
      analysisRunId: run.id,
      sectionKey: 'OVERLAP',
      featureKey: o.featureId,
      publicationNumber: o.priorArtDocument.publicationNumber,
      title: o.priorArtDocument.title,
      description: `${o.featureId} × ${o.priorArtDocument.publicationNumber}: ${o.overlapStatus}`,
    });
    return {
      id: o.id,
      priorArtDocumentId: o.priorArtDocumentId,
      publicationNumber: o.priorArtDocument.publicationNumber,
      featureId: o.featureId,
      featureRecordId: o.featureRecordId,
      featureName: o.featureName,
      overlapStatus: o.overlapStatus,
      evidence: o.evidence,
      evidenceSource: o.evidenceSource,
    };
  });

  let noveltySection: any = emptyState('Novelty assessment unavailable.');
  let noveltyScore: number | null = null;
  let noveltyEvidenceConfidence: number | null = null;
  let maxSingleCoverage: number | null = null;
  let collectiveCoverage: number | null = null;

  if (novelty) {
    noveltyScore = novelty.noveltyScore;
    noveltyEvidenceConfidence = novelty.evidenceConfidence;
    const breakdown = (novelty.scoringBreakdown || {}) as any;
    maxSingleCoverage =
      typeof breakdown.maxSingleCoverage === 'number' ? breakdown.maxSingleCoverage : null;
    collectiveCoverage = novelty.collectiveCoverage;

    evidenceSources.push({
      sourceType: 'NOVELTY_ASSESSMENT',
      sourceId: novelty.id,
      analysisRunId: run.id,
      sectionKey: 'NOVELTY',
      title: 'Novelty Assessment',
      description: `Novelty indicator ${novelty.noveltyScore}`,
    });

    for (const r of novelty.referenceAssessments) {
      evidenceSources.push({
        sourceType: 'NOVELTY_REFERENCE',
        sourceId: r.id,
        analysisRunId: run.id,
        sectionKey: 'NOVELTY',
        publicationNumber: r.priorArtDocument.publicationNumber,
        title: r.priorArtDocument.title,
        description: `Reference coverage ${r.coverageRatio}`,
      });
    }

    noveltySection = {
      available: true,
      noveltyScore: novelty.noveltyScore,
      noveltyBand: novelty.noveltyBand,
      noveltyIndicatorLabel: 'Novelty indicator',
      evidenceConfidence: novelty.evidenceConfidence,
      maxSingleCoverage,
      collectiveCoverage: novelty.collectiveCoverage,
      singleReferenceRisk: novelty.singleReferenceRisk,
      patentabilityRiskIndicator: novelty.patentabilityRisk,
      scoringBreakdown: novelty.scoringBreakdown,
      evidenceReferences: novelty.evidenceReferences,
      groqExplanation: novelty.groqExplanation,
      referenceAssessments: novelty.referenceAssessments.map((r) => ({
        id: r.id,
        priorArtDocumentId: r.priorArtDocumentId,
        publicationNumber: r.priorArtDocument.publicationNumber,
        title: r.priorArtDocument.title,
        disclosedFeatureCount: r.disclosedFeatureCount,
        partialFeatureCount: r.partialFeatureCount,
        notDisclosedFeatureCount: r.notDisclosedFeatureCount,
        insufficientEvidenceCount: r.insufficientEvidenceCount,
        coverageRatio: r.coverageRatio,
        evidenceConfidence: r.evidenceConfidence,
        anticipationRisk: r.anticipationRisk,
        evidenceDetails: r.evidenceDetails,
        potentialSingleReferenceAnticipationConcern: r.anticipationRisk,
      })),
      limitations:
        'Novelty indicators are evidence-based heuristics. They are not legal conclusions of novelty or patentability.',
    };
  }

  const innovationGaps =
    opportunities.length === 0
      ? {
          available: false,
          message: 'No material innovation opportunity identified from available evidence.',
          opportunities: [] as any[],
        }
      : {
          available: true,
          opportunities: opportunities.map((o) => {
            evidenceSources.push({
              sourceType: 'INNOVATION_OPPORTUNITY',
              sourceId: o.id,
              analysisRunId: run.id,
              sectionKey: 'INNOVATION',
              opportunityKey: o.opportunityKey || undefined,
              title: o.title,
              description: o.title,
            });
            return {
              id: o.id,
              opportunityKey: o.opportunityKey,
              gapType: o.gapType,
              title: o.title,
              impact: o.impact,
              whyItMatters: o.whyItMatters,
              expectedImpact: o.expectedImpact,
              recommendedAction: o.recommendedAction,
              relatedFeatureKeys: o.relatedFeatureKeys,
              supportingPriorArtIds: o.supportingPriorArtIds,
              coverage: o.coverage,
              confidence: o.confidence,
              differentiationScore: o.differentiationScore,
              evidenceDetails: o.evidenceDetails,
              limitations: o.limitations,
              explanation: o.explanation,
              explanationProvenance: o.explanationProvenance,
            };
          }),
        };

  const maxDifferentiationScore =
    opportunities.length > 0
      ? Math.max(...opportunities.map((o) => o.differentiationScore ?? 0))
      : null;

  const differentiationAnalysis =
    opportunities.length === 0
      ? {
          available: false,
          message:
            'No material differentiation opportunity identified from the available evidence.',
        }
      : {
          available: true,
          opportunities: opportunities.map((o) => ({
            opportunityKey: o.opportunityKey,
            title: o.title,
            differentiationScore: o.differentiationScore,
            supportingFeatureCombinations: o.relatedFeatureKeys,
            coverage: o.coverage,
            confidence: o.confidence,
            evidence: o.evidenceDetails,
            limitations: o.limitations,
          })),
          maxDifferentiationScore,
        };

  const claimStrategy =
    claims.length === 0
      ? {
          available: false,
          message: 'No claims generated for this analysis.',
          claims: [] as any[],
        }
      : {
          available: true,
          claims: claims.map((c) => {
            const latest = c.versions[0] || null;
            if (!latest) {
              return {
                claimId: c.id,
                claimNumber: c.claimNumber,
                claimType: c.claimType,
                available: false,
                message: 'No claim versions available.',
              };
            }

            evidenceSources.push({
              sourceType: 'CLAIM',
              sourceId: c.id,
              analysisRunId: run.id,
              sectionKey: 'CLAIMS',
              claimNumber: c.claimNumber,
              title: c.title || `Claim ${c.claimNumber}`,
              description: c.title || `Claim ${c.claimNumber}`,
            });

            evidenceSources.push({
              sourceType: 'CLAIM_VERSION',
              sourceId: latest.id,
              analysisRunId: run.id,
              sectionKey: 'CLAIMS',
              claimNumber: c.claimNumber,
              description: `Claim ${c.claimNumber} version ${latest.versionNumber}`,
            });

            const elements = latest.elements.map((e) => {
              if (e.inventionFeature && e.inventionFeature.analysisRunId !== run.id) {
                throw new Error(
                  `ClaimElement "${e.elementKey}" maps to feature outside AnalysisRun "${run.id}".`
                );
              }
              evidenceSources.push({
                sourceType: 'CLAIM_ELEMENT',
                sourceId: e.id,
                analysisRunId: run.id,
                sectionKey: 'CLAIMS',
                elementKey: e.elementKey,
                featureKey: e.featureKey,
                claimNumber: c.claimNumber,
                description: e.text,
              });
              return {
                id: e.id,
                elementKey: e.elementKey,
                text: e.text,
                featureKey: e.featureKey,
                inventionFeatureId: e.inventionFeatureId,
                elementType: e.elementType,
                order: e.order,
                featureTrace: e.inventionFeature
                  ? {
                      featureKey: e.inventionFeature.featureKey,
                      name: e.inventionFeature.name,
                      analysisRunId: e.inventionFeature.analysisRunId,
                    }
                  : null,
              };
            });

            return {
              claimId: c.id,
              claimNumber: c.claimNumber,
              claimType: c.claimType,
              parentClaimNumber: c.parentClaimNumber,
              title: c.title,
              status: c.status,
              latestClaimVersion: {
                id: latest.id,
                versionNumber: latest.versionNumber,
                claimText: latest.claimText,
                isOriginal: latest.isOriginal,
                isOptimized: latest.isOptimized,
                source: latest.source,
                provenance: latest.source,
                optimizationReason: latest.optimizationReason,
                featureCount: latest.featureCount,
                groundedFeatureCount: latest.groundedFeatureCount,
                groundedFeatureRatio: latest.groundedFeatureRatio,
                singleReferenceCoverage: latest.singleReferenceCoverage,
                collectivePriorArtCoverage: latest.collectivePriorArtCoverage,
                evidenceConfidence: latest.evidenceConfidence,
                differentiationScore: latest.differentiationScore,
                vulnerabilityIndicator: latest.vulnerabilityIndicator,
                vulnerabilityScore: latest.vulnerabilityScore,
                vulnerabilityDetails: latest.vulnerabilityDetails,
                limitations: latest.limitations,
                elements,
              },
            };
          }),
        };

  const latestClaimVersions = claims
    .filter((c) => c.versions[0])
    .map((c) => ({
      claimNumber: c.claimNumber,
      versionNumber: c.versions[0].versionNumber,
    }));

  const claimVulnerability =
    claims.length > 0 && claims[0].versions[0]
      ? claims
          .map((c) => c.versions[0]?.vulnerabilityIndicator)
          .filter(Boolean)
          .join(', ') || null
      : null;

  let examinerSection: any = emptyState('Examiner simulation has not been run.');
  let examinerFindingCount: number | null = null;
  let examinerOverallRisk: string | null = null;
  let examinerConfidence: number | null = null;

  if (examinerReview) {
    examinerFindingCount = examinerReview.findings.length;
    examinerOverallRisk = examinerReview.overallRisk;
    examinerConfidence = examinerReview.confidence;

    for (const f of examinerReview.findings) {
      evidenceSources.push({
        sourceType: 'EXAMINER_FINDING',
        sourceId: f.id,
        analysisRunId: run.id,
        sectionKey: 'EXAMINER',
        claimNumber: f.claimNumber,
        title: f.title,
        description: f.title,
      });
    }

    evidenceSources.push({
      sourceType: 'EXAMINER_REVIEW',
      sourceId: examinerReview.id,
      analysisRunId: run.id,
      sectionKey: 'EXAMINER',
      description: `Examiner overall risk ${examinerReview.overallRisk}`,
    });

    examinerSection = {
      available: true,
      id: examinerReview.id,
      status: examinerReview.status,
      overallRisk: examinerReview.overallRisk,
      confidence: examinerReview.confidence,
      claimSummaries: examinerReview.claimReviews || [],
      findings: examinerReview.findings.map((f) => ({
        id: f.id,
        findingType: f.findingType,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        confidence: f.confidence,
        claimNumber: f.claimNumber,
        claimVersionNumber: f.claimVersionNumber,
        claimElementKeys: f.claimElementKeys,
        priorArtDocumentIds: f.priorArtDocumentIds,
        supportingFeatureKeys: f.supportingFeatureKeys,
        evidence: f.evidence,
        recommendation: f.recommendation,
        provenance: f.provenance,
      })),
    };
  }

  const confidenceSamples: number[] = [];
  if (noveltyEvidenceConfidence !== null) confidenceSamples.push(noveltyEvidenceConfidence);
  if (examinerConfidence !== null) confidenceSamples.push(examinerConfidence);
  for (const o of opportunities) {
    if (typeof o.confidence === 'number') confidenceSamples.push(o.confidence);
  }
  for (const c of claims) {
    const v = c.versions[0];
    if (v && typeof v.evidenceConfidence === 'number') confidenceSamples.push(v.evidenceConfidence);
  }
  const overallEvidenceConfidence =
    confidenceSamples.length > 0
      ? Number(
          (confidenceSamples.reduce((a, b) => a + b, 0) / confidenceSamples.length).toFixed(4)
        )
      : null;

  const finalRecommendation = deriveFinalRecommendation({
    priorArtCount: matches.length,
    noveltyScore,
    maxSingleCoverage,
    collectiveCoverage,
    opportunityCount: opportunities.length,
    maxDifferentiationScore,
    examinerOverallRisk,
  });

  const overallAssessment = recommendationNarrative(finalRecommendation, invention.title);

  const executiveSummaryParams = {
    inventionTitle: invention.title,
    analysisRunId: run.id,
    featureCount: features.length,
    priorArtCount: matches.length,
    claimCount: claims.length,
    latestClaimVersions,
    noveltyScore,
    evidenceConfidence: noveltyEvidenceConfidence,
    opportunityCount: opportunities.length,
    maxDifferentiationScore,
    examinerFindingCount,
    examinerOverallRisk,
    claimVulnerability,
    overallEvidenceConfidence,
    finalRecommendation,
  };

  const deterministicExecutiveSummary = buildDeterministicExecutiveSummary(executiveSummaryParams);

  assertEvidenceSourcesBelongToRun(evidenceSources, run.id);

  const sections = {
    executiveSummary: {
      structured: executiveSummaryParams,
      text: deterministicExecutiveSummary,
    },
    inventionOverview: {
      id: invention.id,
      title: invention.title,
      problem: invention.problem,
      solution: invention.solution,
      howItWorks: invention.howItWorks,
      advantages: invention.advantages,
      differentiation: invention.differentiation,
      domain: invention.domain,
      industry: invention.industry,
      status: invention.status,
      metadata: {
        createdAt: invention.createdAt,
        updatedAt: invention.updatedAt,
      },
    },
    technicalFeatures,
    priorArtLandscape,
    priorArtRanking: priorArtLandscape.map((p) => ({
      priorArtDocumentId: p.priorArtDocumentId,
      publicationNumber: p.publicationNumber,
      title: p.title,
      finalRank: p.finalRank,
      ranking: p.ranking,
      rrfScore: p.rrfScore,
      rrfScoreNote: p.rrfScoreNote,
      presentationSimilarityPercent: p.presentationSimilarityPercent,
      similarityFields: {
        presentationSimilarityPercent: p.presentationSimilarityPercent,
        semanticSimilarity: p.semanticSimilarity,
        semanticDistance: p.semanticDistance,
      },
      rankingFields: {
        finalRank: p.finalRank,
        rrfScore: p.rrfScore,
        lexicalRank: p.lexicalRank,
        semanticRank: p.semanticRank,
      },
    })),
    featureOverlapMatrix,
    noveltyAssessment: noveltySection,
    innovationGapAnalysis: innovationGaps,
    differentiationAnalysis,
    claimStrategy,
    claimVulnerability: {
      available: claims.length > 0,
      message: claims.length === 0 ? 'No claims generated for this analysis.' : null,
      claims: Array.isArray((claimStrategy as any).claims)
        ? (claimStrategy as any).claims.map((c: any) => ({
            claimNumber: c.claimNumber,
            vulnerabilityIndicator: c.latestClaimVersion?.vulnerabilityIndicator ?? null,
            vulnerabilityScore: c.latestClaimVersion?.vulnerabilityScore ?? null,
          }))
        : [],
    },
    examinerSimulation: examinerSection,
    evidenceTraceability: {
      sources: evidenceSources,
      note: 'Every sourceId resolves to a record belonging to the current AnalysisRun.',
    },
    risksAndLimitations: {
      items: [
        'All scores are evidence-based heuristics derived from persisted analysis engines.',
        'Semantic similarity is not treated as claim disclosure; overlap matrix is authoritative for disclosure status.',
        'RRF scores are ranking fusion scores and are not similarity scores.',
        novelty
          ? 'Novelty indicators do not constitute a legal determination of novelty or patentability.'
          : 'Novelty assessment unavailable.',
        examinerReview
          ? 'Examiner simulation is not an actual USPTO/EPO examination or legal opinion.'
          : 'Examiner simulation has not been run.',
        matches.length === 0 ? 'Insufficient evidence.' : null,
      ].filter(Boolean),
    },
    finalRecommendation: {
      code: finalRecommendation,
      narrative: overallAssessment,
      reason: recommendationReasonText(finalRecommendation, {
        priorArtCount: matches.length,
        noveltyScore,
        maxSingleCoverage,
        opportunityCount: opportunities.length,
        examinerOverallRisk,
      }),
    },
    educationalLegalDisclaimer: LEGAL_DISCLAIMER,
  };

  const validated = unifiedReportSectionsSchema.safeParse(sections);
  if (!validated.success) {
    throw new Error(`Unified report schema validation failed: ${validated.error.message}`);
  }

  return {
    analysisRunId: run.id,
    inventionId: invention.id,
    userId: invention.userId,
    inventionTitle: invention.title,
    sections: validated.data,
    evidenceSources,
    deterministicExecutiveSummary,
    overallAssessment,
    finalRecommendation,
    recommendationReason: sections.finalRecommendation.reason!,
    executiveSummaryParams,
  };
}

// ==============================================================================
// Persist (idempotent)
// ==============================================================================

async function persistReportEvidenceRows(reportId: string, sources: EvidenceSourceRef[]) {
  await prisma.reportEvidence.deleteMany({ where: { reportId } });
  if (sources.length === 0) return;

  // Chunk inserts for safety
  const rows = sources.map((s) => ({
    reportId,
    sectionKey: s.sectionKey,
    sourceType: s.sourceType,
    sourceId: s.sourceId,
    featureKey: s.featureKey ?? null,
    publicationNumber: s.publicationNumber ?? null,
    claimNumber: s.claimNumber ?? null,
    elementKey: s.elementKey ?? null,
    description: s.description || s.title || null,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    await prisma.reportEvidence.createMany({
      data: rows.slice(i, i + 100),
      skipDuplicates: true,
    });
  }
}

export async function persistUnifiedReport(
  assembled: Awaited<ReturnType<typeof assembleUnifiedReport>>
) {
  const polished = await polishReportNarrativeWithGroq({
    deterministicExecutiveSummary: assembled.deterministicExecutiveSummary,
    overallAssessment: assembled.overallAssessment,
    inventionTitle: assembled.inventionTitle,
    finalRecommendation: assembled.finalRecommendation,
  });

  const sections = {
    ...assembled.sections,
    executiveSummary: {
      ...assembled.sections.executiveSummary,
      text: polished.executiveSummary,
    },
    finalRecommendation: {
      ...assembled.sections.finalRecommendation,
      narrative: polished.overallAssessment,
      reason: assembled.recommendationReason,
    },
  };

  const title = `Unified Patent Intelligence Report: ${assembled.inventionTitle}`;

  const existing = await prisma.report.findUnique({
    where: { analysisRunId: assembled.analysisRunId },
  });

  let report;
  if (existing) {
    report = await prisma.report.update({
      where: { id: existing.id },
      data: {
        inventionId: assembled.inventionId,
        userId: assembled.userId,
        title,
        status: 'COMPLETED',
        reportVersion: existing.reportVersion || 1,
        executiveSummary: polished.executiveSummary,
        overallAssessment: polished.overallAssessment,
        finalRecommendation: assembled.finalRecommendation,
        recommendationReason: assembled.recommendationReason,
        sectionsSnapshot: sections as any,
        evidenceSources: assembled.evidenceSources as any,
        provenance: polished.provenance,
        disclaimer: LEGAL_DISCLAIMER,
      },
    });
  } else {
    report = await prisma.report.create({
      data: {
        inventionId: assembled.inventionId,
        analysisRunId: assembled.analysisRunId,
        userId: assembled.userId,
        title,
        status: 'COMPLETED',
        reportVersion: 1,
        executiveSummary: polished.executiveSummary,
        overallAssessment: polished.overallAssessment,
        finalRecommendation: assembled.finalRecommendation,
        recommendationReason: assembled.recommendationReason,
        sectionsSnapshot: sections as any,
        evidenceSources: assembled.evidenceSources as any,
        provenance: polished.provenance,
        disclaimer: LEGAL_DISCLAIMER,
      },
    });
  }

  if (!report) {
    throw new Error('Failed to persist unified report.');
  }

  await persistReportEvidenceRows(report.id, assembled.evidenceSources);

  return prisma.report.findUniqueOrThrow({
    where: { id: report.id },
    include: {
      evidence: {
        orderBy: [{ sectionKey: 'asc' }, { sourceType: 'asc' }],
      },
    },
  });
}

/** Primary Phase 11 entrypoint. */
export async function generateUnifiedReport(analysisRunId: string, _userId?: string) {
  const assembled = await assembleUnifiedReport(analysisRunId);
  const report = await persistUnifiedReport(assembled);
  return { report, assembled };
}

export async function executeUnifiedReportGeneration(analysisRunId: string) {
  return generateUnifiedReport(analysisRunId);
}

export async function getReportForAnalysis(analysisRunId: string) {
  return prisma.report.findUnique({
    where: { analysisRunId },
    include: {
      evidence: {
        orderBy: [{ sectionKey: 'asc' }, { sourceType: 'asc' }],
      },
    },
  });
}

export async function getReportById(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      analysisRun: true,
      invention: true,
      evidence: {
        orderBy: [{ sectionKey: 'asc' }, { sourceType: 'asc' }],
      },
    },
  });
}
