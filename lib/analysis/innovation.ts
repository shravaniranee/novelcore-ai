/**
 * NovelCore AI — Evidence-Grounded Innovation Gap Engine (Phase 8)
 *
 * Provides evidence-grounded identification of technical areas where the invention
 * appears CROWDED, MODERATELY_EXPLORED, PARTIALLY_EXPLORED, UNDERSERVED, or POTENTIALLY_DISTINCTIVE
 * relative to the retrieved prior-art landscape.
 *
 * Strict Principles:
 * 1. Semantic similarity ALONE never creates an innovation gap. Feature overlap evidence is authoritative.
 * 2. Every gap points to authentic InventionFeature, PriorArtDocument, and FeatureOverlapMatrixEntry records.
 * 3. Single-reference direct combination support is strictly separated from multi-reference individual feature coverage.
 * 4. Groq provides natural-language synthesis only and CANNOT override deterministic classifications or indicators.
 * 5. This engine provides intelligence indicators; it DOES NOT make legal determinations of patentability.
 */

import { prisma } from '@/lib/prisma';
import { GapType, ImpactLevel as PrismaImpact, OverlapStatus } from '@prisma/client';
import { FeatureInputForNovelty, PriorArtDocMeta, MatrixEntryForNovelty } from '@/lib/analysis/novelty';

// ==============================================================================
// 1. Types & Interfaces
// ==============================================================================

export type InnovationGapType =
  | 'CROWDED'
  | 'MODERATELY_EXPLORED'
  | 'PARTIALLY_EXPLORED'
  | 'UNDERSERVED'
  | 'POTENTIALLY_DISTINCTIVE';

export interface FeatureEvidenceProfile {
  featureKey: string;
  featureName: string;
  isNovelty: boolean;
  disclosedDocIds: string[];
  partialDocIds: string[];
  notDisclosedDocIds: string[];
  insufficientDocIds: string[];
  totalEvaluatedDocs: number;
  coverageRatio: number;
  evidenceConfidence: number;
  citations: Array<{
    docId: string;
    publicationNumber: string;
    status: OverlapStatus;
    quote: string;
    source: string;
  }>;
}

export interface DeterministicOpportunity {
  opportunityKey: string;
  title: string;
  gapType: InnovationGapType;
  impact: 'High' | 'Medium' | 'Low';
  whyItMatters: string;
  expectedImpact: string;
  recommendedAction: string;
  relatedFeatureKeys: string[];
  supportingPriorArtIds: string[];
  coverage: number;
  confidence: number;
  differentiationScore: number;
  evidenceDetails: {
    featureProfiles?: Array<{
      featureKey: string;
      featureName: string;
      coverageRatio: number;
    }>;
    citations?: Array<{
      docId: string;
      publicationNumber: string;
      status: OverlapStatus;
      quote: string;
    }>;
    combinationAnalysis?: {
      individualFeatureCoverage: number;
      directCombinationCoverage: number;
      bestDirectSupportingDocId?: string;
    };
  };
  limitations: string;
  explanation?: string;
  explanationProvenance: 'LIVE_GROQ' | 'DETERMINISTIC_FALLBACK';
}

export interface InnovationEngineResult {
  analysisRunId: string;
  inventionId: string;
  opportunities: DeterministicOpportunity[];
  summary: {
    totalOpportunities: number;
    crowdedCount: number;
    moderatelyExploredCount: number;
    partiallyExploredCount: number;
    underservedCount: number;
    distinctiveCombinationsCount: number;
    meanDifferentiationScore: number;
    overallConfidence: number;
  };
}

// ==============================================================================
// 2. Status Weights & Helpers
// ==============================================================================

function getDisclosureWeight(status: OverlapStatus): number {
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

export function toPrismaGapType(type: InnovationGapType): GapType {
  switch (type) {
    case 'CROWDED':
      return GapType.CROWDED;
    case 'MODERATELY_EXPLORED':
      return GapType.MODERATELY_EXPLORED;
    case 'PARTIALLY_EXPLORED':
      return GapType.PARTIALLY_EXPLORED;
    case 'UNDERSERVED':
      return GapType.UNDERSERVED;
    case 'POTENTIALLY_DISTINCTIVE':
      return GapType.POTENTIALLY_DISTINCTIVE;
  }
}

export function toPrismaImpact(impact: 'High' | 'Medium' | 'Low'): PrismaImpact {
  switch (impact) {
    case 'High':
      return PrismaImpact.HIGH;
    case 'Low':
      return PrismaImpact.LOW;
    case 'Medium':
    default:
      return PrismaImpact.MEDIUM;
  }
}

// ==============================================================================
// 3. Feature Evidence Profiling & Classification
// ==============================================================================

/**
 * Builds an evidence profile for an individual invention feature across the matrix.
 */
export function buildFeatureEvidenceProfile(
  feature: FeatureInputForNovelty,
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[]
): FeatureEvidenceProfile {
  const featEntries = matrixEntries.filter((e) => e.featureId === feature.featureKey);
  const disclosedDocIds: string[] = [];
  const partialDocIds: string[] = [];
  const notDisclosedDocIds: string[] = [];
  const insufficientDocIds: string[] = [];
  const citations: FeatureEvidenceProfile['citations'] = [];

  let weightedSum = 0;
  let conclusiveCount = 0;

  for (const entry of featEntries) {
    const doc = priorArtDocs.find((d) => d.id === entry.priorArtDocumentId);
    const pubNum = doc?.publicationNumber || entry.priorArtDocumentId;
    const weight = getDisclosureWeight(entry.overlapStatus);
    weightedSum += weight;

    if (entry.overlapStatus === 'DISCLOSED') {
      disclosedDocIds.push(entry.priorArtDocumentId);
      conclusiveCount++;
    } else if (entry.overlapStatus === 'PARTIAL') {
      partialDocIds.push(entry.priorArtDocumentId);
      conclusiveCount++;
    } else if (entry.overlapStatus === 'NOT_DISCLOSED') {
      notDisclosedDocIds.push(entry.priorArtDocumentId);
      conclusiveCount++;
    } else {
      insufficientDocIds.push(entry.priorArtDocumentId);
    }

    if (entry.evidence && entry.evidence.trim().length > 0 && entry.evidence !== 'INSUFFICIENT_EVIDENCE') {
      citations.push({
        docId: entry.priorArtDocumentId,
        publicationNumber: pubNum,
        status: entry.overlapStatus,
        quote: entry.evidence,
        source: entry.evidenceSource || 'description',
      });
    }
  }

  const totalEvaluatedDocs = priorArtDocs.length;
  const coverageRatio = totalEvaluatedDocs > 0
    ? Number((weightedSum / totalEvaluatedDocs).toFixed(4))
    : 0.0;

  const evidenceConfidence = featEntries.length > 0
    ? Number(((conclusiveCount / featEntries.length) * Math.min(1.0, featEntries.length / 3)).toFixed(4))
    : 0.0;

  return {
    featureKey: feature.featureKey,
    featureName: feature.name,
    isNovelty: Boolean(feature.isNovelty),
    disclosedDocIds,
    partialDocIds,
    notDisclosedDocIds,
    insufficientDocIds,
    totalEvaluatedDocs,
    coverageRatio,
    evidenceConfidence,
    citations,
  };
}

/**
 * Deterministically classifies an individual technical feature into a controlled gap type.
 */
export function classifyFeatureGap(profile: FeatureEvidenceProfile): {
  gapType: InnovationGapType;
  impact: 'High' | 'Medium' | 'Low';
  rationale: string;
} {
  const { disclosedDocIds, partialDocIds, coverageRatio, totalEvaluatedDocs } = profile;
  const disclosedCount = disclosedDocIds.length;
  const partialCount = partialDocIds.length;

  // 1. CROWDED: 3+ prior-art references fully disclose, or >= 60% of corpus discloses
  if (disclosedCount >= 3 || (totalEvaluatedDocs >= 3 && coverageRatio >= 0.60)) {
    return {
      gapType: 'CROWDED',
      impact: 'Low',
      rationale: `Substantial repeated disclosure found across ${disclosedCount} prior-art reference(s). Technology appears heavily explored in the retrieved set.`,
    };
  }

  // 2. UNDERSERVED: 0 disclosures, at most 1 partial, low overall coverage
  if (disclosedCount === 0 && partialCount <= 1 && coverageRatio < 0.25) {
    return {
      gapType: 'UNDERSERVED',
      impact: profile.isNovelty ? 'High' : 'Medium',
      rationale: `Limited substantive representation found in the retrieved prior-art set (${disclosedCount} disclosed, ${partialCount} partial). Represents an open strategic white-space opportunity.`,
    };
  }

  // 3. PARTIALLY_EXPLORED: 2+ partial disclosures, or partial with non-disclosure
  if (partialCount >= 2 || (partialCount >= 1 && disclosedCount <= 1 && profile.notDisclosedDocIds.length >= 1)) {
    return {
      gapType: 'PARTIALLY_EXPLORED',
      impact: 'Medium',
      rationale: `Prior art addresses this technical area in incomplete or fragmented form (${partialCount} partial disclosures). Optimization opportunity lies in closing structural gaps.`,
    };
  }

  // 4. MODERATELY_EXPLORED: Standard intermediate coverage
  return {
    gapType: 'MODERATELY_EXPLORED',
    impact: 'Medium',
    rationale: `Meaningful prior-art disclosure observed (${disclosedCount} full, ${partialCount} partial), but the space is neither pervasive nor completely underserved.`,
  };
}

// ==============================================================================
// 4. Combination Generation & Direct Combination Support
// ==============================================================================

export interface FeatureCombination {
  combinationKey: string;
  name: string;
  featureKeys: string[];
  features: FeatureInputForNovelty[];
}

/**
 * Generates controlled combinations (2 to 4 features) without combinatorial explosion.
 * Prioritizes:
 * 1. Novelty candidates paired with other key features
 * 2. Functionally adjacent/subsystem features
 * 3. High-differentiation pairs
 * Maximum: 6 combinations.
 */
export function generateControlledCombinations(
  features: FeatureInputForNovelty[]
): FeatureCombination[] {
  if (features.length < 2) return [];

  const combinations: FeatureCombination[] = [];
  const noveltyFeatures = features.filter((f) => f.isNovelty);
  const otherFeatures = features.filter((f) => !f.isNovelty);

  // Strategy A: Novelty candidate paired with each subsequent feature (up to 3)
  for (const nFeat of noveltyFeatures) {
    for (const oFeat of otherFeatures.slice(0, 3)) {
      if (combinations.length >= 6) break;
      const keys = [nFeat.featureKey, oFeat.featureKey].sort();
      const combKey = `comb-${keys.join('-')}`;
      if (!combinations.some((c) => c.combinationKey === combKey)) {
        combinations.push({
          combinationKey: combKey,
          name: `${nFeat.name} + ${oFeat.name}`,
          featureKeys: keys,
          features: [nFeat, oFeat],
        });
      }
    }
  }

  // Strategy B: Subsystem pairs (adjacent features in order)
  for (let i = 0; i < features.length - 1 && combinations.length < 6; i++) {
    const f1 = features[i];
    const f2 = features[i + 1];
    const keys = [f1.featureKey, f2.featureKey].sort();
    const combKey = `comb-${keys.join('-')}`;
    if (!combinations.some((c) => c.combinationKey === combKey)) {
      combinations.push({
        combinationKey: combKey,
        name: `${f1.name} + ${f2.name}`,
        featureKeys: keys,
        features: [f1, f2],
      });
    }
  }

  // Strategy C: 3-feature synergistic triplet if available
  if (features.length >= 3 && combinations.length < 6) {
    const triplet = features.slice(0, 3);
    const keys = triplet.map((f) => f.featureKey).sort();
    combinations.push({
      combinationKey: `comb-${keys.join('-')}`,
      name: `${triplet[0].name} + ${triplet[1].name} + ${triplet[2].name}`,
      featureKeys: keys,
      features: triplet,
    });
  }

  return combinations.slice(0, 6);
}

/**
 * Evaluates combination support across candidate prior art.
 * Strictly separates direct single-document support from collective cross-document coverage.
 */
export function evaluateCombinationSupport(
  combination: FeatureCombination,
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[]
): {
  individualFeatureCoverage: number;
  directCombinationCoverage: number;
  bestDirectSupportingDocId?: string;
  gapType: InnovationGapType;
  impact: 'High' | 'Medium' | 'Low';
  rationale: string;
} {
  const k = combination.featureKeys.length;

  // 1. Calculate individual feature collective coverage across separate art
  let individualCoverageSum = 0;
  for (const fKey of combination.featureKeys) {
    let maxFeatWeight = 0;
    for (const entry of matrixEntries) {
      if (entry.featureId === fKey) {
        maxFeatWeight = Math.max(maxFeatWeight, getDisclosureWeight(entry.overlapStatus));
      }
    }
    individualCoverageSum += maxFeatWeight;
  }
  const individualFeatureCoverage = k > 0
    ? Number((individualCoverageSum / k).toFixed(4))
    : 0.0;

  // 2. Calculate direct combination support (same document disclosing all features together)
  let maxDirectSupport = 0.0;
  let bestDirectDocId: string | undefined;

  for (const doc of priorArtDocs) {
    let docSum = 0;
    for (const fKey of combination.featureKeys) {
      const entry = matrixEntries.find(
        (e) => e.priorArtDocumentId === doc.id && e.featureId === fKey
      );
      if (entry) {
        docSum += getDisclosureWeight(entry.overlapStatus);
      }
    }
    const directDocCoverage = docSum / k;
    if (directDocCoverage > maxDirectSupport) {
      maxDirectSupport = directDocCoverage;
      bestDirectDocId = doc.id;
    }
  }

  const directCombinationCoverage = Number(maxDirectSupport.toFixed(4));

  // 3. Classification
  // POTENTIALLY_DISTINCTIVE: Individual features may exist in field, but direct single-reference
  // co-occurrence is low (<= 0.50, meaning no single reference discloses the combination)
  if (directCombinationCoverage <= 0.50) {
    return {
      individualFeatureCoverage,
      directCombinationCoverage,
      bestDirectSupportingDocId: bestDirectDocId,
      gapType: 'POTENTIALLY_DISTINCTIVE',
      impact: 'High',
      rationale: `Individual features have representation (${Math.round(individualFeatureCoverage * 100)}% collective), but no single prior-art document directly combines them (${Math.round(directCombinationCoverage * 100)}% direct co-occurrence). Represents a potentially distinctive architectural combination within the retrieved set.`,
    };
  }

  if (directCombinationCoverage >= 0.70) {
    return {
      individualFeatureCoverage,
      directCombinationCoverage,
      bestDirectSupportingDocId: bestDirectDocId,
      gapType: 'CROWDED',
      impact: 'Low',
      rationale: `The combination is substantially co-disclosed within a single prior-art reference (${bestDirectDocId || 'cited art'}).`,
    };
  }

  return {
    individualFeatureCoverage,
    directCombinationCoverage,
    bestDirectSupportingDocId: bestDirectDocId,
    gapType: 'MODERATELY_EXPLORED',
    impact: 'Medium',
    rationale: `The combination has moderate partial co-occurrence in the retrieved references.`,
  };
}

// ==============================================================================
// 5. Differentiation Indicator & Confidence Math
// ==============================================================================

/**
 * Calculates evidence-based differentiation indicator (0–100).
 * Reflects lower prior-art coverage combined with high evidence confidence.
 */
export function calculateDifferentiationScore(coverage: number, confidence: number): number {
  const rawScore = 100 * (1.0 - coverage) * (0.7 + 0.3 * confidence);
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

// ==============================================================================
// 6. Comprehensive Opportunity Generation Pipeline
// ==============================================================================

export function generateDeterministicOpportunities(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[]
): DeterministicOpportunity[] {
  // Empty data guard
  if (features.length === 0 || priorArtDocs.length === 0 || matrixEntries.length === 0) {
    return [];
  }

  const opportunities: DeterministicOpportunity[] = [];

  // A. Feature-Level Opportunities
  for (const feat of features) {
    const profile = buildFeatureEvidenceProfile(feat, matrixEntries, priorArtDocs);
    const classification = classifyFeatureGap(profile);
    const diffScore = calculateDifferentiationScore(profile.coverageRatio, profile.evidenceConfidence);

    // Supporting prior art: documents that disclose or partially disclose
    const supportingDocs = [
      ...profile.disclosedDocIds,
      ...profile.partialDocIds,
    ];

    let whyItMatters = classification.rationale;
    let expectedImpact = '';
    let recommendedAction = '';

    if (classification.gapType === 'UNDERSERVED') {
      expectedImpact = 'Provides an open landscape for broad patent protection and strong competitive differentiation.';
      recommendedAction = `Prioritize ${feat.name} as a standalone independent claim element with defensible structural parameters.`;
    } else if (classification.gapType === 'PARTIALLY_EXPLORED') {
      expectedImpact = 'Closes identified technical gaps that competitors have left open.';
      recommendedAction = `Specify structural improvements over existing partial disclosures in ${supportingDocs.join(', ') || 'prior art'}.`;
    } else if (classification.gapType === 'CROWDED') {
      expectedImpact = 'Avoids direct assertion of already disclosed elements in independent claims.';
      recommendedAction = `Subordinate ${feat.name} into dependent claims or couple it with distinctive secondary constraints.`;
    } else {
      expectedImpact = 'Strengthens claim defensibility with fine-grained operational parameters.';
      recommendedAction = `Refine claim limitations around specific performance thresholds and feedback loops.`;
    }

    opportunities.push({
      opportunityKey: `feat-${feat.featureKey}`,
      title: `${feat.name} (${classification.gapType.replace('_', ' ')})`,
      gapType: classification.gapType,
      impact: classification.impact,
      whyItMatters,
      expectedImpact,
      recommendedAction,
      relatedFeatureKeys: [feat.featureKey],
      supportingPriorArtIds: supportingDocs.slice(0, 5),
      coverage: profile.coverageRatio,
      confidence: profile.evidenceConfidence,
      differentiationScore: diffScore,
      evidenceDetails: {
        featureProfiles: [
          {
            featureKey: feat.featureKey,
            featureName: feat.name,
            coverageRatio: profile.coverageRatio,
          },
        ],
        citations: profile.citations.slice(0, 5),
      },
      limitations: 'Analysis reflects retrieved prior-art documents only and does not constitute a legal patentability opinion.',
      explanationProvenance: 'DETERMINISTIC_FALLBACK',
    });
  }

  // B. Combination-Level Opportunities
  const combinations = generateControlledCombinations(features);
  for (const comb of combinations) {
    const combAnalysis = evaluateCombinationSupport(comb, matrixEntries, priorArtDocs);
    const overallConf = features.length > 0
      ? Number((matrixEntries.filter((e) => e.overlapStatus !== 'INSUFFICIENT_EVIDENCE').length / matrixEntries.length).toFixed(4))
      : 0.0;

    const diffScore = calculateDifferentiationScore(combAnalysis.directCombinationCoverage, overallConf);

    opportunities.push({
      opportunityKey: comb.combinationKey,
      title: `${comb.name} (Combination)`,
      gapType: combAnalysis.gapType,
      impact: combAnalysis.impact,
      whyItMatters: combAnalysis.rationale,
      expectedImpact: combAnalysis.gapType === 'POTENTIALLY_DISTINCTIVE'
        ? 'Establishes a resilient synergistic claim combination that cannot be anticipated by any single cited reference.'
        : 'Aligns subsystem integration with documented industry baselines.',
      recommendedAction: combAnalysis.gapType === 'POTENTIALLY_DISTINCTIVE'
        ? `Draft multi-element independent claim combining [${comb.features.map((f) => f.name).join(', ')}] in cooperative interaction.`
        : 'Add secondary operational interlocks to heighten defensibility.',
      relatedFeatureKeys: comb.featureKeys,
      supportingPriorArtIds: combAnalysis.bestDirectSupportingDocId
        ? [combAnalysis.bestDirectSupportingDocId]
        : [],
      coverage: combAnalysis.directCombinationCoverage,
      confidence: overallConf,
      differentiationScore: diffScore,
      evidenceDetails: {
        combinationAnalysis: {
          individualFeatureCoverage: combAnalysis.individualFeatureCoverage,
          directCombinationCoverage: combAnalysis.directCombinationCoverage,
          bestDirectSupportingDocId: combAnalysis.bestDirectSupportingDocId,
        },
      },
      limitations: 'Co-occurrence indicators are based on the retrieved prior-art corpus and do not imply an official statutory obviousness determination.',
      explanationProvenance: 'DETERMINISTIC_FALLBACK',
    });
  }

  // Sort opportunities: POTENTIALLY_DISTINCTIVE and UNDERSERVED first, then by differentiationScore descending
  return opportunities.sort((a, b) => {
    const rank = (type: InnovationGapType) => {
      switch (type) {
        case 'POTENTIALLY_DISTINCTIVE':
          return 1;
        case 'UNDERSERVED':
          return 2;
        case 'PARTIALLY_EXPLORED':
          return 3;
        case 'MODERATELY_EXPLORED':
          return 4;
        case 'CROWDED':
          return 5;
      }
    };
    const rA = rank(a.gapType);
    const rB = rank(b.gapType);
    if (rA !== rB) return rA - rB;
    return b.differentiationScore - a.differentiationScore;
  });
}

// ==============================================================================
// 7. Database Persistence & Idempotency
// ==============================================================================

export async function persistInnovationOpportunities(
  analysisRunId: string,
  inventionId: string,
  opportunities: DeterministicOpportunity[],
  groqExplanations?: Record<string, string>
) {
  // 1. Remove stale opportunities for this analysisRunId that are no longer in the active set
  const currentKeys = opportunities.map((o) => o.opportunityKey);
  await prisma.analysisOpportunity.deleteMany({
    where: {
      analysisRunId,
      OR: [
        { opportunityKey: { notIn: currentKeys } },
        { opportunityKey: null },
      ],
    },
  });

  // 2. Upsert each opportunity deterministically
  for (const opp of opportunities) {
    const explanationText = groqExplanations?.[opp.opportunityKey] || opp.whyItMatters;
    const provenance = groqExplanations?.[opp.opportunityKey]
      ? 'LIVE_GROQ'
      : opp.explanationProvenance;

    await prisma.analysisOpportunity.upsert({
      where: {
        analysisRunId_opportunityKey: {
          analysisRunId,
          opportunityKey: opp.opportunityKey,
        },
      },
      update: {
        title: opp.title,
        gapType: toPrismaGapType(opp.gapType),
        impact: toPrismaImpact(opp.impact),
        whyItMatters: opp.whyItMatters,
        expectedImpact: opp.expectedImpact,
        recommendedAction: opp.recommendedAction,
        relatedFeatureKeys: opp.relatedFeatureKeys,
        supportingPriorArtIds: opp.supportingPriorArtIds,
        coverage: opp.coverage,
        confidence: opp.confidence,
        differentiationScore: opp.differentiationScore,
        evidenceDetails: opp.evidenceDetails as any,
        limitations: opp.limitations,
        explanation: explanationText,
        explanationProvenance: provenance,
        updatedAt: new Date(),
      },
      create: {
        inventionId,
        analysisRunId,
        opportunityKey: opp.opportunityKey,
        title: opp.title,
        gapType: toPrismaGapType(opp.gapType),
        impact: toPrismaImpact(opp.impact),
        whyItMatters: opp.whyItMatters,
        expectedImpact: opp.expectedImpact,
        recommendedAction: opp.recommendedAction,
        relatedFeatureKeys: opp.relatedFeatureKeys,
        supportingPriorArtIds: opp.supportingPriorArtIds,
        coverage: opp.coverage,
        confidence: opp.confidence,
        differentiationScore: opp.differentiationScore,
        evidenceDetails: opp.evidenceDetails as any,
        limitations: opp.limitations,
        explanation: explanationText,
        explanationProvenance: provenance,
      },
    });
  }
}

// ==============================================================================
// 8. Evidence Provenance & Cross-Analysis Validation
// ==============================================================================

export async function validateOpportunityEvidenceProvenance(analysisRunId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const opportunities = await prisma.analysisOpportunity.findMany({
    where: { analysisRunId },
  });

  if (opportunities.length === 0) {
    return { valid: true, errors: [] };
  }

  // 1. Fetch authentic analysis context
  const allowedMatches = await prisma.priorArtMatch.findMany({
    where: { analysisRunId },
    select: { priorArtDocId: true },
  });
  const allowedDocIds = new Set(allowedMatches.map((m) => m.priorArtDocId));

  const allowedFeatures = await prisma.inventionFeature.findMany({
    where: { analysisRunId },
    select: { featureKey: true },
  });
  const allowedFeatureKeys = new Set(allowedFeatures.map((f) => f.featureKey));

  // 2. Validate each opportunity
  for (const opp of opportunities) {
    for (const docId of opp.supportingPriorArtIds) {
      if (!allowedDocIds.has(docId)) {
        errors.push(
          `Opportunity "${opp.opportunityKey}" cites unauthorized cross-analysis or unknown priorArtDocumentId "${docId}"`
        );
      }
    }

    for (const fKey of opp.relatedFeatureKeys) {
      if (!allowedFeatureKeys.has(fKey)) {
        errors.push(
          `Opportunity "${opp.opportunityKey}" cites unknown featureKey "${fKey}"`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==============================================================================
// 9. Structured Query Helper for API & UI
// ==============================================================================

export async function getInnovationGapsForAnalysis(analysisRunId: string) {
  return await prisma.analysisOpportunity.findMany({
    where: { analysisRunId },
    orderBy: [
      { differentiationScore: 'desc' },
      { createdAt: 'asc' },
    ],
  });
}
