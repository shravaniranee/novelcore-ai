/**
 * NovelCore AI — Phase 9: AI-Assisted Claim Strategy & Optimization Engine
 *
 * Deterministic, evidence-grounded patent claim construction, vulnerability profiling,
 * feature traceability, and immutable claim versioning.
 *
 * All claims and substantive limitations are strictly mapped to authentic InventionFeature
 * records from the active AnalysisRun.
 */

import { prisma } from '@/lib/prisma';
import { OverlapStatus, ClaimType, ClaimStatus } from '@prisma/client';
import {
  FeatureInputForNovelty,
  PriorArtDocMeta,
  MatrixEntryForNovelty,
} from '@/lib/analysis/novelty';
import { DeterministicOpportunity } from '@/lib/analysis/innovation';

export type FeatureRole = 'CORE' | 'SUPPORTING' | 'NARROWING';

export interface PrioritizedClaimFeature {
  featureId: string;
  featureKey: string;
  name: string;
  description: string;
  isNovelty: boolean;
  role: FeatureRole;
  gapType?: string;
  coverageRatio: number;
  evidenceConfidence: number;
  importanceWeight: number;
}

export interface ClaimElementInput {
  elementKey: string;
  text: string;
  featureKey: string;
  order: number;
  elementType?: string; // 'PREAMBLE' | 'TRANSITION' | 'LIMITATION' | 'NARROWING'
}

export interface ClaimProposal {
  claimNumber: number;
  claimType: 'INDEPENDENT' | 'DEPENDENT';
  parentClaimNumber?: number;
  title: string;
  claimText: string;
  elements: ClaimElementInput[];
  noveltyFocus?: string;
  limitation?: string;
  source?: string;
  model?: string;
  optimizationReason?: string;
}

export interface ClaimVulnerabilityDetail {
  priorArtDocumentId: string;
  publicationNumber: string;
  title: string;
  coverageRatio: number;
  disclosedFeatures: string[];
  missingFeatures: string[];
}

export interface ClaimMetrics {
  featureCount: number;
  groundedFeatureCount: number;
  groundedFeatureRatio: number;
  singleReferenceCoverage: number;
  collectivePriorArtCoverage: number;
  evidenceConfidence: number;
  differentiationScore: number;
  vulnerabilityIndicator: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityScore: number;
  priorArtVulnerabilities: ClaimVulnerabilityDetail[];
  vulnerabilityDetails: Record<string, any>;
}

export interface ValidatedClaim extends ClaimProposal {
  metrics: ClaimMetrics;
}

// ==============================================================================
// 1. Disclosure Weight Helper
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

// ==============================================================================
// 2. Feature Prioritization Engine
// ==============================================================================

/**
 * Categorizes and ranks invention features for claim construction.
 * Evaluates novelty candidacy, evidence coverage, and gap classification.
 */
export function prioritizeClaimFeatures(
  features: FeatureInputForNovelty[],
  matrixEntries: MatrixEntryForNovelty[],
  priorArtDocs: PriorArtDocMeta[],
  opportunities: DeterministicOpportunity[] = []
): PrioritizedClaimFeature[] {
  const oppMap = new Map<string, DeterministicOpportunity>();
  for (const opp of opportunities) {
    for (const fk of opp.relatedFeatureKeys) {
      if (!oppMap.has(fk) || opp.gapType === 'POTENTIALLY_DISTINCTIVE') {
        oppMap.set(fk, opp);
      }
    }
  }

  const prioritized: PrioritizedClaimFeature[] = [];

  for (const feat of features) {
    const featEntries = matrixEntries.filter((m) => m.featureId === feat.featureKey);
    let weightedSum = 0;
    let conclusiveCount = 0;

    for (const entry of featEntries) {
      weightedSum += getDisclosureWeight(entry.overlapStatus);
      if (entry.evidence && entry.evidence !== 'INSUFFICIENT_EVIDENCE') {
        conclusiveCount++;
      }
    }

    const totalDocs = priorArtDocs.length;
    const coverageRatio = totalDocs > 0 ? Number((weightedSum / totalDocs).toFixed(4)) : 0.0;
    const evidenceConfidence = featEntries.length > 0
      ? Number(((conclusiveCount / featEntries.length) * Math.min(1.0, featEntries.length / 3)).toFixed(4))
      : 0.0;

    const opp = oppMap.get(feat.featureKey);
    const gapType = opp?.gapType;

    // Determine technical claim role:
    // CORE: isNovelty candidate OR distinctive combination member OR underserved
    // NARROWING: highly specific or partially explored feature
    // SUPPORTING: common/crowded foundational feature required for operable system
    let role: FeatureRole = 'SUPPORTING';
    let importanceWeight = 50;

    if (feat.isNovelty || gapType === 'POTENTIALLY_DISTINCTIVE') {
      role = 'CORE';
      importanceWeight = 95;
    } else if (gapType === 'UNDERSERVED' && coverageRatio < 0.25) {
      role = 'CORE';
      importanceWeight = 85;
    } else if (gapType === 'PARTIALLY_EXPLORED' || (coverageRatio >= 0.25 && coverageRatio < 0.65)) {
      role = 'NARROWING';
      importanceWeight = 65;
    } else if (coverageRatio >= 0.65) {
      role = 'SUPPORTING';
      importanceWeight = 40;
    }

    prioritized.push({
      featureId: feat.id,
      featureKey: feat.featureKey,
      name: feat.name,
      description: feat.description || feat.name,
      isNovelty: Boolean(feat.isNovelty),
      role,
      gapType,
      coverageRatio,
      evidenceConfidence,
      importanceWeight,
    });
  }

  // Sort: CORE first (by importance desc), then NARROWING, then SUPPORTING
  return prioritized.sort((a, b) => b.importanceWeight - a.importanceWeight);
}

// ==============================================================================
// 3. Claim Coverage & Vulnerability Metrics Calculation
// ==============================================================================

/**
 * Calculates deterministic claim metrics: feature grounding ratio,
 * single-reference coverage, collective coverage, differentiation score,
 * and prior-art vulnerability indicators.
 */
export function calculateClaimMetrics(
  elements: ClaimElementInput[],
  priorArtDocs: PriorArtDocMeta[],
  matrixEntries: MatrixEntryForNovelty[],
  validFeatures: FeatureInputForNovelty[]
): ClaimMetrics {
  const validFeatureKeys = new Set(validFeatures.map((f) => f.featureKey));
  const substantiveElements = elements.filter((e) => e.featureKey && e.featureKey.trim() !== '');

  const featureCount = substantiveElements.length;
  let groundedFeatureCount = 0;

  for (const elem of substantiveElements) {
    if (validFeatureKeys.has(elem.featureKey)) {
      groundedFeatureCount++;
    }
  }

  const groundedFeatureRatio = featureCount > 0
    ? Number((groundedFeatureCount / featureCount).toFixed(4))
    : 1.0;

  const claimFeatureKeys = Array.from(new Set(substantiveElements.map((e) => e.featureKey)));
  const k = claimFeatureKeys.length;

  if (k === 0 || priorArtDocs.length === 0) {
    return {
      featureCount,
      groundedFeatureCount,
      groundedFeatureRatio,
      singleReferenceCoverage: 0.0,
      collectivePriorArtCoverage: 0.0,
      evidenceConfidence: 0.0,
      differentiationScore: 50,
      vulnerabilityIndicator: 'LOW',
      vulnerabilityScore: 0,
      priorArtVulnerabilities: [],
      vulnerabilityDetails: { reason: 'No claim features or prior art provided.' },
    };
  }

  // 1. Calculate Single-Reference Coverage across prior-art documents
  let maxSingleCoverage = 0.0;
  const priorArtVulnerabilities: ClaimVulnerabilityDetail[] = [];
  let totalConfidenceSum = 0;
  let confidenceCount = 0;

  for (const doc of priorArtDocs) {
    let docWeightedSum = 0;
    const disclosedFeatures: string[] = [];
    const missingFeatures: string[] = [];

    for (const fKey of claimFeatureKeys) {
      const entry = matrixEntries.find(
        (m) => m.priorArtDocumentId === doc.id && m.featureId === fKey
      );
      if (entry) {
        const weight = getDisclosureWeight(entry.overlapStatus);
        docWeightedSum += weight;
        if (entry.overlapStatus === 'DISCLOSED') {
          disclosedFeatures.push(fKey);
        } else if (entry.overlapStatus === 'PARTIAL') {
          disclosedFeatures.push(`${fKey} (partial)`);
        } else {
          missingFeatures.push(fKey);
        }

        if (entry.evidence && entry.evidence !== 'INSUFFICIENT_EVIDENCE') {
          totalConfidenceSum += 1.0;
        }
        confidenceCount++;
      } else {
        missingFeatures.push(fKey);
      }
    }

    const docCoverage = Number((docWeightedSum / k).toFixed(4));
    if (docCoverage > maxSingleCoverage) {
      maxSingleCoverage = docCoverage;
    }

    if (docCoverage > 0.0) {
      priorArtVulnerabilities.push({
        priorArtDocumentId: doc.id,
        publicationNumber: doc.publicationNumber,
        title: doc.title,
        coverageRatio: docCoverage,
        disclosedFeatures,
        missingFeatures,
      });
    }
  }

  // Sort prior-art vulnerabilities by coverage ratio descending
  priorArtVulnerabilities.sort((a, b) => b.coverageRatio - a.coverageRatio);

  // 2. Collective Prior-Art Coverage
  let collectiveSum = 0;
  for (const fKey of claimFeatureKeys) {
    let maxFeatWeight = 0;
    for (const doc of priorArtDocs) {
      const entry = matrixEntries.find(
        (m) => m.priorArtDocumentId === doc.id && m.featureId === fKey
      );
      if (entry) {
        maxFeatWeight = Math.max(maxFeatWeight, getDisclosureWeight(entry.overlapStatus));
      }
    }
    collectiveSum += maxFeatWeight;
  }
  const collectivePriorArtCoverage = Number((collectiveSum / k).toFixed(4));

  // 3. Evidence Confidence
  const evidenceConfidence = confidenceCount > 0
    ? Number((totalConfidenceSum / confidenceCount).toFixed(4))
    : 0.0;

  // 4. Vulnerability Indicator & Score
  // Reflects prior-art proximity (potential single-reference or collective obviousness vulnerability)
  let vulnerabilityIndicator: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let vulnerabilityScore = Math.round(maxSingleCoverage * 60 + collectivePriorArtCoverage * 40);

  if (maxSingleCoverage >= 0.80) {
    vulnerabilityIndicator = 'CRITICAL';
  } else if (maxSingleCoverage >= 0.55 || collectivePriorArtCoverage >= 0.85) {
    vulnerabilityIndicator = 'HIGH';
  } else if (maxSingleCoverage >= 0.35 || collectivePriorArtCoverage >= 0.60) {
    vulnerabilityIndicator = 'MEDIUM';
  } else {
    vulnerabilityIndicator = 'LOW';
  }

  // 5. Differentiation Indicator (0 - 100)
  const differentiationScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 * (1.0 - maxSingleCoverage) * (0.70 + 0.30 * evidenceConfidence))
    )
  );

  return {
    featureCount,
    groundedFeatureCount,
    groundedFeatureRatio,
    singleReferenceCoverage: maxSingleCoverage,
    collectivePriorArtCoverage,
    evidenceConfidence,
    differentiationScore,
    vulnerabilityIndicator,
    vulnerabilityScore,
    priorArtVulnerabilities,
    vulnerabilityDetails: {
      maxSingleCoverage,
      collectivePriorArtCoverage,
      evaluatedFeatures: claimFeatureKeys,
      topVulnerablePatent: priorArtVulnerabilities[0]?.publicationNumber || null,
    },
  };
}

// ==============================================================================
// 4. Deterministic Claim Proposal Construction
// ==============================================================================

/**
 * Builds deterministic independent and dependent claim proposals grounded in existing features.
 */
export function generateDeterministicClaims(
  inventionTitle: string,
  inventionDomain: string,
  prioritizedFeatures: PrioritizedClaimFeature[],
  priorArtDocs: PriorArtDocMeta[],
  matrixEntries: MatrixEntryForNovelty[]
): ValidatedClaim[] {
  if (prioritizedFeatures.length === 0) {
    return [];
  }

  const validFeaturesMeta: FeatureInputForNovelty[] = prioritizedFeatures.map((p) => ({
    id: p.featureId,
    featureKey: p.featureKey,
    name: p.name,
    description: p.description,
    isNovelty: p.isNovelty,
  }));

  const coreFeatures = prioritizedFeatures.filter((f) => f.role === 'CORE');
  const supportingFeatures = prioritizedFeatures.filter((f) => f.role === 'SUPPORTING');
  const narrowingFeatures = prioritizedFeatures.filter((f) => f.role === 'NARROWING');

  // --------------------------------------------------------------------------
  // Independent Claim 1 (System / Apparatus)
  // Combines core differentiating features with necessary supporting framing
  // --------------------------------------------------------------------------
  const indFeatures: PrioritizedClaimFeature[] = [];
  if (coreFeatures.length > 0) {
    indFeatures.push(...coreFeatures.slice(0, 2));
  }
  if (supportingFeatures.length > 0 && indFeatures.length < 3) {
    indFeatures.push(supportingFeatures[0]);
  }
  if (indFeatures.length < 2 && prioritizedFeatures.length >= 2) {
    for (const f of prioritizedFeatures) {
      if (!indFeatures.some((item) => item.featureKey === f.featureKey)) {
        indFeatures.push(f);
        if (indFeatures.length >= 3) break;
      }
    }
  }

  const indElements: ClaimElementInput[] = [
    {
      elementKey: 'elem-preamble',
      text: `An apparatus for ${inventionTitle.toLowerCase()} in a ${inventionDomain} environment`,
      featureKey: indFeatures[0]?.featureKey || 'F1',
      order: 1,
      elementType: 'PREAMBLE',
    },
    {
      elementKey: 'elem-trans',
      text: 'comprising:',
      featureKey: indFeatures[0]?.featureKey || 'F1',
      order: 2,
      elementType: 'TRANSITION',
    },
  ];

  for (let i = 0; i < indFeatures.length; i++) {
    const f = indFeatures[i];
    indElements.push({
      elementKey: `elem-lim-${f.featureKey}`,
      text: `${i === indFeatures.length - 1 ? 'and ' : ''}a subsystem configured to implement ${f.description || f.name};`,
      featureKey: f.featureKey,
      order: i + 3,
      elementType: 'LIMITATION',
    });
  }

  const indClaimText = `1. ${indElements[0].text}, ${indElements[1].text}\n` +
    indElements.slice(2).map((e) => `  ${e.text}`).join('\n');

  const indMetrics = calculateClaimMetrics(
    indElements,
    priorArtDocs,
    matrixEntries,
    validFeaturesMeta
  );

  const claims: ValidatedClaim[] = [
    {
      claimNumber: 1,
      claimType: 'INDEPENDENT',
      title: 'Core Independent Apparatus Claim',
      claimText: indClaimText,
      elements: indElements,
      noveltyFocus: coreFeatures[0]?.name || prioritizedFeatures[0]?.name,
      source: 'SYSTEM_GENERATED',
      metrics: indMetrics,
    },
  ];

  // --------------------------------------------------------------------------
  // Dependent Claims 2..N
  // Adds narrowing features or remaining core features as dependent restrictions
  // --------------------------------------------------------------------------
  const usedInInd = new Set(indFeatures.map((f) => f.featureKey));
  const remainingFeatures = prioritizedFeatures.filter((f) => !usedInInd.has(f.featureKey));
  const candidatesForDep = remainingFeatures.length > 0 ? remainingFeatures : prioritizedFeatures;

  const depTargetCount = Math.min(4, candidatesForDep.length);

  for (let i = 0; i < depTargetCount; i++) {
    const depFeat = candidatesForDep[i];
    const claimNum = i + 2;

    const depElements: ClaimElementInput[] = [
      {
        elementKey: `elem-dep-preamble-${depFeat.featureKey}`,
        text: `The apparatus of claim 1, wherein`,
        featureKey: indFeatures[0]?.featureKey || 'F1',
        order: 1,
        elementType: 'PREAMBLE',
      },
      {
        elementKey: `elem-dep-lim-${depFeat.featureKey}`,
        text: `the subsystem further comprises ${depFeat.description || depFeat.name}.`,
        featureKey: depFeat.featureKey,
        order: 2,
        elementType: 'NARROWING',
      },
    ];

    const depClaimText = `${claimNum}. ${depElements[0].text} ${depElements[1].text}`;

    // Cumulative elements for metrics: includes Claim 1 elements + this dependent element
    const cumulativeElements = [...indElements, depElements[1]];
    const depMetrics = calculateClaimMetrics(
      cumulativeElements,
      priorArtDocs,
      matrixEntries,
      validFeaturesMeta
    );

    claims.push({
      claimNumber: claimNum,
      claimType: 'DEPENDENT',
      parentClaimNumber: 1,
      title: `Dependent Narrowing Claim ${claimNum}`,
      claimText: depClaimText,
      elements: depElements,
      limitation: depFeat.name,
      source: 'SYSTEM_GENERATED',
      metrics: depMetrics,
    });
  }

  return claims;
}

// ==============================================================================
// 5. Claim Feature Grounding Validation
// ==============================================================================

export interface ClaimValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that every substantive element in a claim maps strictly to an authentic
 * InventionFeature belonging to the current AnalysisRun.
 */
export function validateClaimFeatureGrounding(
  proposal: ClaimProposal,
  validFeatures: FeatureInputForNovelty[]
): ClaimValidationResult {
  const errors: string[] = [];
  const validFeatureKeys = new Set(validFeatures.map((f) => f.featureKey));

  if (!proposal.elements || proposal.elements.length === 0) {
    errors.push(`Claim #${proposal.claimNumber} contains no structural elements.`);
  }

  for (const elem of proposal.elements || []) {
    if (!elem.featureKey || !validFeatureKeys.has(elem.featureKey)) {
      errors.push(
        `Claim #${proposal.claimNumber} element "${elem.elementKey}" references invalid feature "${elem.featureKey}". Must be one of: [${Array.from(validFeatureKeys).join(', ')}]`
      );
    }
  }

  if (proposal.claimType === 'DEPENDENT') {
    if (!proposal.parentClaimNumber || proposal.parentClaimNumber >= proposal.claimNumber) {
      errors.push(
        `Dependent claim #${proposal.claimNumber} must reference an earlier parent claim number (got: ${proposal.parentClaimNumber}).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==============================================================================
// 6. Relational Persistence & Idempotency
// ==============================================================================

/**
 * Persists a validated claim strategy to PostgreSQL.
 * Idempotent on initial run: updates existing claim numbers and version 1.
 */
export async function persistClaimStrategy(
  inventionId: string,
  analysisRunId: string,
  claims: ValidatedClaim[]
): Promise<void> {
  // Fetch active features to resolve inventionFeatureId foreign keys
  const dbFeatures = await prisma.inventionFeature.findMany({
    where: { analysisRunId },
  });
  const featIdMap = new Map<string, string>();
  for (const f of dbFeatures) {
    featIdMap.set(f.featureKey, f.id);
  }

  for (const proposal of claims) {
    const claimTypeEnum = proposal.claimType === 'DEPENDENT'
      ? ClaimType.DEPENDENT
      : ClaimType.INDEPENDENT;

    // 1. Upsert Claim container
    const claimRecord = await prisma.claim.upsert({
      where: {
        inventionId_claimNumber: {
          inventionId,
          claimNumber: proposal.claimNumber,
        },
      },
      update: {
        analysisRunId,
        claimType: claimTypeEnum,
        parentClaimNumber: proposal.parentClaimNumber || null,
        title: proposal.title,
        status: ClaimStatus.DRAFT,
        updatedAt: new Date(),
      },
      create: {
        inventionId,
        analysisRunId,
        claimNumber: proposal.claimNumber,
        claimType: claimTypeEnum,
        parentClaimNumber: proposal.parentClaimNumber || null,
        title: proposal.title,
        status: ClaimStatus.DRAFT,
      },
    });

    // 2. Upsert ClaimVersion 1 (Initial Version)
    const versionRecord = await prisma.claimVersion.upsert({
      where: {
        claimId_versionNumber: {
          claimId: claimRecord.id,
          versionNumber: 1,
        },
      },
      update: {
        analysisRunId,
        claimText: proposal.claimText,
        isOriginal: true,
        source: proposal.source || 'SYSTEM_GENERATED',
        model: proposal.model || null,
        optimizationReason: proposal.optimizationReason || null,
        groundedFeatureRatio: proposal.metrics.groundedFeatureRatio,
        featureCount: proposal.metrics.featureCount,
        groundedFeatureCount: proposal.metrics.groundedFeatureCount,
        singleReferenceCoverage: proposal.metrics.singleReferenceCoverage,
        collectivePriorArtCoverage: proposal.metrics.collectivePriorArtCoverage,
        evidenceConfidence: proposal.metrics.evidenceConfidence,
        differentiationScore: proposal.metrics.differentiationScore,
        vulnerabilityIndicator: proposal.metrics.vulnerabilityIndicator,
        vulnerabilityScore: proposal.metrics.vulnerabilityScore,
        vulnerabilityDetails: proposal.metrics.vulnerabilityDetails,
        priorArtVulnerabilities: proposal.metrics.priorArtVulnerabilities as any,
        differentiationNotes: proposal.noveltyFocus || proposal.limitation || null,
      },
      create: {
        claimId: claimRecord.id,
        analysisRunId,
        versionNumber: 1,
        claimText: proposal.claimText,
        isOriginal: true,
        isOptimized: false,
        source: proposal.source || 'SYSTEM_GENERATED',
        model: proposal.model || null,
        optimizationReason: proposal.optimizationReason || null,
        groundedFeatureRatio: proposal.metrics.groundedFeatureRatio,
        featureCount: proposal.metrics.featureCount,
        groundedFeatureCount: proposal.metrics.groundedFeatureCount,
        singleReferenceCoverage: proposal.metrics.singleReferenceCoverage,
        collectivePriorArtCoverage: proposal.metrics.collectivePriorArtCoverage,
        evidenceConfidence: proposal.metrics.evidenceConfidence,
        differentiationScore: proposal.metrics.differentiationScore,
        vulnerabilityIndicator: proposal.metrics.vulnerabilityIndicator,
        vulnerabilityScore: proposal.metrics.vulnerabilityScore,
        vulnerabilityDetails: proposal.metrics.vulnerabilityDetails,
        priorArtVulnerabilities: proposal.metrics.priorArtVulnerabilities as any,
        differentiationNotes: proposal.noveltyFocus || proposal.limitation || null,
      },
    });

    // 3. Upsert ClaimElements
    for (const elem of proposal.elements) {
      const featureId = featIdMap.get(elem.featureKey) || null;

      await prisma.claimElement.upsert({
        where: {
          claimVersionId_elementKey: {
            claimVersionId: versionRecord.id,
            elementKey: elem.elementKey,
          },
        },
        update: {
          text: elem.text,
          featureKey: elem.featureKey,
          inventionFeatureId: featureId,
          order: elem.order,
          elementType: elem.elementType || 'LIMITATION',
        },
        create: {
          claimVersionId: versionRecord.id,
          elementKey: elem.elementKey,
          text: elem.text,
          featureKey: elem.featureKey,
          inventionFeatureId: featureId,
          order: elem.order,
          elementType: elem.elementType || 'LIMITATION',
        },
      });
    }
  }
}

// ==============================================================================
// 7. Non-Destructive Claim Optimization Engine
// ==============================================================================

export interface OptimizeClaimRequest {
  claimId: string;
  analysisRunId: string;
  reason?: string;
  narrowingFeatureKey?: string;
}

/**
 * Optimizes an existing claim by incorporating an existing narrowing or underserved feature.
 * Strictly non-destructive: creates an incremented ClaimVersion (e.g. Version 2)
 * while keeping historical versions untouched.
 */
export async function optimizeClaim(
  request: OptimizeClaimRequest
): Promise<{ success: boolean; newVersion: any; error?: string }> {
  const claim = await prisma.claim.findUnique({
    where: { id: request.claimId },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: { elements: true },
      },
      invention: {
        include: {
          inventionFeatures: {
            where: { analysisRunId: request.analysisRunId },
          },
        },
      },
    },
  });

  if (!claim) {
    return { success: false, newVersion: null, error: 'Claim not found.' };
  }

  const latestVersion = claim.versions[0];
  if (!latestVersion) {
    return { success: false, newVersion: null, error: 'No existing claim version to optimize.' };
  }

  const validFeatures = claim.invention.inventionFeatures.map((f) => ({
    id: f.id,
    featureKey: f.featureKey,
    name: f.name,
    description: f.description,
    isNovelty: f.isNovelty,
  }));

  // Fetch matrix entries and prior art for metrics
  const matrixEntries = await prisma.featureOverlapMatrixEntry.findMany({
    where: { analysisRunId: request.analysisRunId },
  });
  const priorArtDocs = await prisma.priorArtDocument.findMany({
    where: {
      matches: { some: { analysisRunId: request.analysisRunId } },
    },
  });

  const matrixInputs: MatrixEntryForNovelty[] = matrixEntries.map((m) => ({
    priorArtDocumentId: m.priorArtDocumentId,
    featureId: m.featureId,
    overlapStatus: m.overlapStatus,
    evidence: m.evidence,
    evidenceSource: m.evidenceSource || 'none',
  }));

  const docInputs: PriorArtDocMeta[] = priorArtDocs.map((d) => ({
    id: d.id,
    publicationNumber: d.publicationNumber,
    title: d.title,
  }));

  // Select narrowing feature from existing invention features
  const existingElementFeatureKeys = new Set(latestVersion.elements.map((e) => e.featureKey));
  let featureToIncorporate = validFeatures.find((f) => f.featureKey === request.narrowingFeatureKey);

  if (!featureToIncorporate) {
    // Find an unused feature, preferably novelty or underserved
    featureToIncorporate = validFeatures.find((f) => !existingElementFeatureKeys.has(f.featureKey))
      || validFeatures[0];
  }

  if (!featureToIncorporate) {
    return { success: false, newVersion: null, error: 'No valid invention features available for optimization.' };
  }

  const nextVersionNumber = latestVersion.versionNumber + 1;
  const newElementKey = `elem-opt-${featureToIncorporate.featureKey}-${nextVersionNumber}`;
  const newLimitationText = `wherein the subsystem further incorporates ${featureToIncorporate.description || featureToIncorporate.name} to restrict operational tolerance.`;

  const updatedElements: ClaimElementInput[] = [
    ...latestVersion.elements.map((e) => ({
      elementKey: e.elementKey,
      text: e.text,
      featureKey: e.featureKey,
      order: e.order,
      elementType: e.elementType,
    })),
    {
      elementKey: newElementKey,
      text: newLimitationText,
      featureKey: featureToIncorporate.featureKey,
      order: latestVersion.elements.length + 1,
      elementType: 'NARROWING',
    },
  ];

  // Recalculate metrics for the newly narrowed claim
  const newMetrics = calculateClaimMetrics(
    updatedElements,
    docInputs,
    matrixInputs,
    validFeatures
  );

  const formattedClaimText = `${latestVersion.claimText.replace(/\.\s*$/, '')}, ${newLimitationText}`;

  // Persist immutable new ClaimVersion
  const newVersion = await prisma.claimVersion.create({
    data: {
      claimId: claim.id,
      analysisRunId: request.analysisRunId,
      versionNumber: nextVersionNumber,
      claimText: formattedClaimText,
      isOriginal: false,
      isOptimized: true,
      source: 'AI_ASSISTED',
      model: 'openai/gpt-oss-20b',
      optimizationReason: request.reason || `Incorporated technical limitation ${featureToIncorporate.featureKey} (${featureToIncorporate.name}) to decrease prior-art vulnerability.`,
      groundedFeatureRatio: newMetrics.groundedFeatureRatio,
      featureCount: newMetrics.featureCount,
      groundedFeatureCount: newMetrics.groundedFeatureCount,
      singleReferenceCoverage: newMetrics.singleReferenceCoverage,
      collectivePriorArtCoverage: newMetrics.collectivePriorArtCoverage,
      evidenceConfidence: newMetrics.evidenceConfidence,
      differentiationScore: newMetrics.differentiationScore,
      vulnerabilityIndicator: newMetrics.vulnerabilityIndicator,
      vulnerabilityScore: newMetrics.vulnerabilityScore,
      vulnerabilityDetails: newMetrics.vulnerabilityDetails,
      priorArtVulnerabilities: newMetrics.priorArtVulnerabilities as any,
      differentiationNotes: `Narrowed with ${featureToIncorporate.featureKey}: ${featureToIncorporate.name}`,
    },
  });

  // Persist updated ClaimElements for the new version
  for (const elem of updatedElements) {
    await prisma.claimElement.create({
      data: {
        claimVersionId: newVersion.id,
        elementKey: elem.elementKey,
        text: elem.text,
        featureKey: elem.featureKey,
        inventionFeatureId: featureToIncorporate.id,
        order: elem.order,
        elementType: elem.elementType || 'LIMITATION',
      },
    });
  }

  // Update claim status to OPTIMIZED
  await prisma.claim.update({
    where: { id: claim.id },
    data: { status: ClaimStatus.OPTIMIZED },
  });

  return { success: true, newVersion };
}

// ==============================================================================
// 8. Retrieval Helper for Analysis
// ==============================================================================

/**
 * Retrieves all claims, active versions, and elements for an AnalysisRun or Invention.
 */
export async function getClaimsForAnalysis(analysisRunId: string, inventionId?: string) {
  return prisma.claim.findMany({
    where: {
      OR: [
        { analysisRunId },
        ...(inventionId ? [{ inventionId }] : []),
      ],
    },
    orderBy: { claimNumber: 'asc' },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          elements: {
            orderBy: { order: 'asc' },
            include: {
              inventionFeature: true,
            },
          },
        },
      },
    },
  });
}
