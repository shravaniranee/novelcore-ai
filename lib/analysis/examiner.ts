/**
 * NovelCore AI — Phase 10: Evidence-Grounded Examiner Simulation Engine
 *
 * Simulates patent examiner evaluation of the current/latest claim set.
 * Evaluates:
 *   1. Potential single-reference anticipation concerns (Section 102 style)
 *   2. Potential obviousness-style concerns based on collective prior-art coverage (Section 103 style)
 *   3. Potential written-description / support concerns (Section 112 style)
 *   4. Dependent claim inherited-feature resolution
 *
 * All findings are strictly grounded in authentic records belonging to the CURRENT AnalysisRun.
 * Semantic similarity is never equated to claim disclosure.
 * Groq only enhances wording of deterministic findings; never decides metrics or conclusions.
 */

import { prisma } from '@/lib/prisma';
import {
  OverlapStatus,
  RiskLevel,
  ExaminerReviewStatus,
  ExaminerFindingType,
} from '@prisma/client';
import { isGroqConfigured, generateStructuredCompletion } from '@/lib/ai/groq';
import { z } from 'zod';

// ==============================================================================
// 1. Interfaces & Types
// ==============================================================================

export interface ClaimForExaminer {
  id: string;
  claimNumber: number;
  claimType: 'INDEPENDENT' | 'DEPENDENT';
  parentClaimNumber?: number | null;
  title: string;
  latestVersion: {
    id: string;
    versionNumber: number;
    claimText: string;
    elements: Array<{
      elementKey: string;
      text: string;
      featureKey: string;
      elementType?: string;
      inventionFeatureId?: string | null;
    }>;
  };
}

export interface PriorArtForExaminer {
  id: string;
  publicationNumber: string;
  title: string;
  abstract?: string;
  technologyDomain?: string;
}

export interface MatrixEntryForExaminer {
  priorArtDocumentId: string;
  featureId: string; // featureKey
  overlapStatus: OverlapStatus;
  evidence: string;
  evidenceSource?: string | null;
}

export interface FeatureForExaminer {
  id: string;
  featureKey: string;
  name: string;
  description: string;
  isNovelty?: boolean;
}

export interface FindingEvidenceDetail {
  featureKey: string;
  overlapStatus: OverlapStatus;
  priorArtDocumentId: string;
  publicationNumber: string;
  evidenceQuote: string;
}

export interface DeterministicExaminerFinding {
  findingType: ExaminerFindingType;
  severity: RiskLevel;
  title: string;
  explanation: string;
  confidence: number;
  claimNumber: number;
  claimVersionNumber: number;
  claimElementKeys: string[];
  priorArtDocumentIds: string[];
  supportingFeatureKeys: string[];
  evidence: FindingEvidenceDetail[];
  recommendation: string;
  provenance: 'DETERMINISTIC' | 'GROQ_ASSISTED';
}

export interface ClaimExaminerSummary {
  claimNumber: number;
  claimVersionNumber: number;
  claimType: 'INDEPENDENT' | 'DEPENDENT';
  overallRisk: RiskLevel;
  highestSeverity: RiskLevel;
  findingsCount: number;
  anticipationConcern: boolean;
  obviousnessConcern: boolean;
  supportConcern: boolean;
  evidenceConfidence: number;
  singleReferenceCoverage: number;
  collectivePriorArtCoverage: number;
  effectiveFeaturesCount: number;
  effectiveFeatureKeys: string[];
}

export interface DeterministicExaminerReviewResult {
  analysisRunId: string;
  inventionId: string;
  overallRisk: RiskLevel;
  confidence: number;
  status: ExaminerReviewStatus;
  claimSummaries: ClaimExaminerSummary[];
  findings: DeterministicExaminerFinding[];
  meta: {
    totalClaimsEvaluated: number;
    independentCount: number;
    dependentCount: number;
    totalFindings: number;
    educationalNotice: string;
  };
}

// ==============================================================================
// 2. Weights & Disclosure Helper
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
// 3. Dependent Claim Feature Inheritance
// ==============================================================================

/**
 * Resolves the complete effective set of feature keys for a claim.
 * For independent claims: returns its own substantive feature keys.
 * For dependent claims: recursively resolves and inherits all parent claim features.
 */
export function resolveEffectiveClaimFeatures(
  targetClaim: ClaimForExaminer,
  allClaims: ClaimForExaminer[]
): { effectiveFeatureKeys: string[]; elementKeys: string[]; hasCycle: boolean } {
  const visitedClaimNumbers = new Set<number>();
  const effectiveFeatureKeys: string[] = [];
  const elementKeys: string[] = [];

  let currentClaim: ClaimForExaminer | undefined = targetClaim;

  while (currentClaim) {
    if (visitedClaimNumbers.has(currentClaim.claimNumber)) {
      return { effectiveFeatureKeys, elementKeys, hasCycle: true };
    }
    visitedClaimNumbers.add(currentClaim.claimNumber);

    for (const elem of currentClaim.latestVersion.elements) {
      if (elem.featureKey && elem.featureKey.trim() !== '') {
        if (!effectiveFeatureKeys.includes(elem.featureKey)) {
          effectiveFeatureKeys.push(elem.featureKey);
        }
      }
      if (elem.elementKey && !elementKeys.includes(elem.elementKey)) {
        elementKeys.push(elem.elementKey);
      }
    }

    if (currentClaim.claimType === 'DEPENDENT' && currentClaim.parentClaimNumber) {
      const parentNum: number = currentClaim.parentClaimNumber;
      currentClaim = allClaims.find((c: ClaimForExaminer) => c.claimNumber === parentNum);
    } else {
      currentClaim = undefined;
    }
  }

  return { effectiveFeatureKeys, elementKeys, hasCycle: false };
}

// ==============================================================================
// 4. Evidence Boundary & Cross-Analysis Validation
// ==============================================================================

export function validateCrossAnalysisEvidence(
  analysisRunId: string,
  claims: ClaimForExaminer[],
  priorArtDocs: PriorArtForExaminer[],
  matrixEntries: MatrixEntryForExaminer[],
  features: FeatureForExaminer[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validFeatureKeys = new Set(features.map((f) => f.featureKey));
  const validDocIds = new Set(priorArtDocs.map((d) => d.id));

  // 1. Verify all claim elements map to valid features
  for (const claim of claims) {
    for (const elem of claim.latestVersion.elements) {
      if (elem.featureKey && !validFeatureKeys.has(elem.featureKey)) {
        errors.push(
          `Claim #${claim.claimNumber} element "${elem.elementKey}" references cross-analysis or invalid feature "${elem.featureKey}".`
        );
      }
    }
  }

  // 2. Verify all matrix entries reference valid docs and features
  for (const entry of matrixEntries) {
    if (!validDocIds.has(entry.priorArtDocumentId)) {
      errors.push(
        `Matrix entry references invalid or cross-analysis priorArtDocumentId "${entry.priorArtDocumentId}".`
      );
    }
    if (!validFeatureKeys.has(entry.featureId)) {
      errors.push(
        `Matrix entry references invalid or cross-analysis featureId "${entry.featureId}".`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==============================================================================
// 5. Deterministic Examiner Simulation Engine
// ==============================================================================

export function calculateDeterministicExaminerReview(
  analysisRunId: string,
  inventionId: string,
  claims: ClaimForExaminer[],
  priorArtDocs: PriorArtForExaminer[],
  matrixEntries: MatrixEntryForExaminer[],
  features: FeatureForExaminer[]
): DeterministicExaminerReviewResult {
  const educationalNotice =
    'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. Examiner simulation is an evidence-based heuristic and is not an actual patent examination or legal opinion.';

  // Edge Case A: Zero claims
  if (claims.length === 0) {
    return {
      analysisRunId,
      inventionId,
      overallRisk: 'LOW',
      confidence: 0.0,
      status: 'COMPLETED',
      claimSummaries: [],
      findings: [],
      meta: {
        totalClaimsEvaluated: 0,
        independentCount: 0,
        dependentCount: 0,
        totalFindings: 0,
        educationalNotice,
      },
    };
  }

  const validFeatureKeys = new Set(features.map((f) => f.featureKey));
  const docMap = new Map<string, PriorArtForExaminer>();
  for (const doc of priorArtDocs) {
    docMap.set(doc.id, doc);
  }

  const allFindings: DeterministicExaminerFinding[] = [];
  const claimSummaries: ClaimExaminerSummary[] = [];

  // Sort claims sequentially by claimNumber
  const sortedClaims = [...claims].sort((a, b) => a.claimNumber - b.claimNumber);

  for (const claim of sortedClaims) {
    const claimNum = claim.claimNumber;
    const versionNum = claim.latestVersion.versionNumber;

    // 1. Resolve effective features (including inherited features for dependent claims)
    const { effectiveFeatureKeys, elementKeys, hasCycle } = resolveEffectiveClaimFeatures(
      claim,
      sortedClaims
    );

    let anticipationConcern = false;
    let obviousnessConcern = false;
    let supportConcern = false;
    let highestSeverity: RiskLevel = 'LOW';

    // ------------------------------------------------------------------------
    // SECTION 112 CHECK: Written-Description & Support Concerns
    // ------------------------------------------------------------------------
    const ungroundedElements = claim.latestVersion.elements.filter(
      (e) => !e.featureKey || !validFeatureKeys.has(e.featureKey)
    );

    if (ungroundedElements.length > 0 || hasCycle) {
      supportConcern = true;
      highestSeverity = 'CRITICAL';

      allFindings.push({
        findingType: 'POTENTIAL_SUPPORT_CONCERN',
        severity: 'CRITICAL',
        title: `Potential §112-style support concern (Claim ${claimNum})`,
        explanation: hasCycle
          ? `Circular dependency detected in claim hierarchy for Claim ${claimNum}.`
          : `Potential support concern: this claim limitation is not sufficiently grounded in the currently available invention feature evidence. Contains ${ungroundedElements.length} unmapped element(s): ${ungroundedElements.map((e) => e.elementKey).join(', ')}.`,
        confidence: 0.95,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: ungroundedElements.map((e) => e.elementKey),
        priorArtDocumentIds: [],
        supportingFeatureKeys: [],
        evidence: [],
        recommendation:
          'Ensure every substantive claim element is explicitly supported by the detailed description and specification, mapping directly to recognized technical features.',
        provenance: 'DETERMINISTIC',
      });
    }

    // Check empty description on grounded features
    for (const fKey of effectiveFeatureKeys) {
      const feat = features.find((f) => f.featureKey === fKey);
      if (feat && (!feat.description || feat.description.trim() === '')) {
        supportConcern = true;
        if (highestSeverity === 'LOW') highestSeverity = 'HIGH';

        allFindings.push({
          findingType: 'POTENTIAL_SUPPORT_CONCERN',
          severity: 'HIGH',
          title: `Potential specification support ambiguity on feature ${fKey} (Claim ${claimNum})`,
          explanation: `Potential support concern: technical feature ${fKey} ("${feat.name}") lacks an articulated structural description in the active analysis record.`,
          confidence: 0.85,
          claimNumber: claimNum,
          claimVersionNumber: versionNum,
          claimElementKeys: elementKeys,
          priorArtDocumentIds: [],
          supportingFeatureKeys: [fKey],
          evidence: [],
          recommendation:
            'Expand the written description with working examples and enabling structural parameters for this feature.',
          provenance: 'DETERMINISTIC',
        });
      }
    }

    const k = effectiveFeatureKeys.length;

    // Edge Case B & C: No features or No Prior Art
    if (k === 0 || priorArtDocs.length === 0) {
      if (priorArtDocs.length === 0 && !supportConcern) {
        allFindings.push({
          findingType: 'EVIDENCE_INSUFFICIENT',
          severity: 'LOW',
          title: `Insufficient prior-art landscape evidence (Claim ${claimNum})`,
          explanation:
            'No prior-art candidate documents are available in the current analysis run. Single-reference anticipation and obviousness simulations cannot be performed.',
          confidence: 0.0,
          claimNumber: claimNum,
          claimVersionNumber: versionNum,
          claimElementKeys: elementKeys,
          priorArtDocumentIds: [],
          supportingFeatureKeys: effectiveFeatureKeys,
          evidence: [],
          recommendation:
            'Execute prior-art retrieval and ingest candidate references to enable statutory landscape review.',
          provenance: 'DETERMINISTIC',
        });
      }

      claimSummaries.push({
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimType: claim.claimType,
        overallRisk: supportConcern ? highestSeverity : 'LOW',
        highestSeverity,
        findingsCount: allFindings.filter((f) => f.claimNumber === claimNum).length,
        anticipationConcern: false,
        obviousnessConcern: false,
        supportConcern,
        evidenceConfidence: 0.0,
        singleReferenceCoverage: 0.0,
        collectivePriorArtCoverage: 0.0,
        effectiveFeaturesCount: k,
        effectiveFeatureKeys,
      });
      continue;
    }

    // ------------------------------------------------------------------------
    // SECTION 102 CHECK: Potential Single-Reference Anticipation Analysis
    // ------------------------------------------------------------------------
    let maxSingleCoverage = 0.0;
    let topDoc: PriorArtForExaminer | null = null;
    let topDocEvidence: FindingEvidenceDetail[] = [];
    let totalConfidenceSum = 0;
    let confidenceCount = 0;

    for (const doc of priorArtDocs) {
      let docScore = 0;
      const docEvidence: FindingEvidenceDetail[] = [];

      for (const fKey of effectiveFeatureKeys) {
        const entry = matrixEntries.find(
          (m) => m.priorArtDocumentId === doc.id && m.featureId === fKey
        );
        if (entry) {
          const weight = getDisclosureWeight(entry.overlapStatus);
          docScore += weight;
          if (weight > 0) {
            docEvidence.push({
              featureKey: fKey,
              overlapStatus: entry.overlapStatus,
              priorArtDocumentId: doc.id,
              publicationNumber: doc.publicationNumber,
              evidenceQuote: entry.evidence || 'Disclosed limitation',
            });
          }
          if (entry.evidence && entry.evidence !== 'INSUFFICIENT_EVIDENCE') {
            totalConfidenceSum += 1.0;
          }
          confidenceCount++;
        }
      }

      const docCoverage = Number((docScore / k).toFixed(4));
      if (docCoverage > maxSingleCoverage) {
        maxSingleCoverage = docCoverage;
        topDoc = doc;
        topDocEvidence = docEvidence;
      }
    }

    const evidenceConfidence = confidenceCount > 0
      ? Number((totalConfidenceSum / confidenceCount).toFixed(4))
      : 0.0;

    // Anticipation thresholds:
    // Coverage >= 0.80 -> CRITICAL
    // Coverage >= 0.65 and < 0.80 (with confidence >= 0.50) -> HIGH
    if (maxSingleCoverage >= 0.80 && topDoc) {
      anticipationConcern = true;
      highestSeverity = 'CRITICAL';

      allFindings.push({
        findingType: 'POTENTIAL_ANTICIPATION',
        severity: 'CRITICAL',
        title: `Potential single-reference anticipation concern (Claim ${claimNum})`,
        explanation: `Prior art reference ${topDoc.publicationNumber} ("${topDoc.title}") covers ${Math.round(maxSingleCoverage * 100)}% of the evaluated claim limitations. One prior-art reference covers a substantial portion of the evaluated claim limitations. Professional patent review is recommended.`,
        confidence: evidenceConfidence,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: elementKeys,
        priorArtDocumentIds: [topDoc.id],
        supportingFeatureKeys: topDocEvidence.map((e) => e.featureKey),
        evidence: topDocEvidence,
        recommendation:
          'Review whether the claim differentiating technical combination is sufficiently specific and supported, or incorporate additional narrowing features from underserved gaps.',
        provenance: 'DETERMINISTIC',
      });
    } else if (maxSingleCoverage >= 0.65 && topDoc && evidenceConfidence >= 0.50) {
      anticipationConcern = true;
      if ((highestSeverity as string) === 'LOW' || (highestSeverity as string) === 'MEDIUM') {
        highestSeverity = 'HIGH';
      }

      allFindings.push({
        findingType: 'POTENTIAL_ANTICIPATION',
        severity: 'HIGH',
        title: `Potential elevated single-reference coverage concern (Claim ${claimNum})`,
        explanation: `Prior art reference ${topDoc.publicationNumber} exhibits substantial single-reference overlap (${Math.round(maxSingleCoverage * 100)}%) against evaluated claim limitations. One prior-art reference covers a substantial portion of the evaluated claim limitations. Professional patent review is recommended.`,
        confidence: evidenceConfidence,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: elementKeys,
        priorArtDocumentIds: [topDoc.id],
        supportingFeatureKeys: topDocEvidence.map((e) => e.featureKey),
        evidence: topDocEvidence,
        recommendation:
          'Consider introducing further structural boundaries or operational constraints to strengthen differentiation over this primary reference.',
        provenance: 'DETERMINISTIC',
      });
    }

    // ------------------------------------------------------------------------
    // SECTION 103 CHECK: Potential Obviousness-Style Analysis
    // ------------------------------------------------------------------------
    let collectiveSum = 0;
    const collectiveEvidence: FindingEvidenceDetail[] = [];
    const collectiveDocIds = new Set<string>();

    for (const fKey of effectiveFeatureKeys) {
      let maxWeight = 0;
      let bestEntry: MatrixEntryForExaminer | null = null;

      for (const doc of priorArtDocs) {
        const entry = matrixEntries.find(
          (m) => m.priorArtDocumentId === doc.id && m.featureId === fKey
        );
        if (entry) {
          const w = getDisclosureWeight(entry.overlapStatus);
          if (w > maxWeight) {
            maxWeight = w;
            bestEntry = entry;
          }
        }
      }

      collectiveSum += maxWeight;
      if (bestEntry && maxWeight > 0) {
        collectiveDocIds.add(bestEntry.priorArtDocumentId);
        const docObj = docMap.get(bestEntry.priorArtDocumentId);
        collectiveEvidence.push({
          featureKey: fKey,
          overlapStatus: bestEntry.overlapStatus,
          priorArtDocumentId: bestEntry.priorArtDocumentId,
          publicationNumber: docObj?.publicationNumber || bestEntry.priorArtDocumentId,
          evidenceQuote: bestEntry.evidence,
        });
      }
    }

    const collectivePriorArtCoverage = Number((collectiveSum / k).toFixed(4));

    if (collectivePriorArtCoverage >= 0.85) {
      obviousnessConcern = true;
      if (highestSeverity !== 'CRITICAL') {
        highestSeverity = 'HIGH';
      }

      allFindings.push({
        findingType: 'POTENTIAL_OBVIOUSNESS',
        severity: 'HIGH',
        title: `Potential §103-style obviousness concern (Claim ${claimNum})`,
        explanation: `Multiple references collectively cover ${Math.round(collectivePriorArtCoverage * 100)}% of the evaluated claim limitations across the prior-art landscape. Multiple references collectively cover many of the evaluated claim limitations. This may warrant professional analysis of whether the claimed combination provides a meaningful technical distinction.`,
        confidence: evidenceConfidence,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: elementKeys,
        priorArtDocumentIds: Array.from(collectiveDocIds),
        supportingFeatureKeys: collectiveEvidence.map((e) => e.featureKey),
        evidence: collectiveEvidence,
        recommendation:
          'Evaluate whether the claimed combination produces an unexpected technical synergy or incorporating non-obvious technical limitations to distinguish over collective prior-art teachings.',
        provenance: 'DETERMINISTIC',
      });
    } else if (collectivePriorArtCoverage >= 0.70) {
      obviousnessConcern = true;
      if (highestSeverity === 'LOW') {
        highestSeverity = 'MEDIUM';
      }

      allFindings.push({
        findingType: 'POTENTIAL_OBVIOUSNESS',
        severity: 'MEDIUM',
        title: `Potential moderate obviousness-style landscape exposure (Claim ${claimNum})`,
        explanation: `Prior-art references collectively cover ${Math.round(collectivePriorArtCoverage * 100)}% of the evaluated claim limitations. This may warrant professional analysis of whether the claimed combination provides a meaningful technical distinction.`,
        confidence: evidenceConfidence,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: elementKeys,
        priorArtDocumentIds: Array.from(collectiveDocIds),
        supportingFeatureKeys: collectiveEvidence.map((e) => e.featureKey),
        evidence: collectiveEvidence,
        recommendation:
          'Review whether secondary references provide motivation to combine with primary references, and ensure technical advantages are clearly documented.',
        provenance: 'DETERMINISTIC',
      });
    }

    // ------------------------------------------------------------------------
    // NO MATERIAL CONCERN: When claim is well differentiated
    // ------------------------------------------------------------------------
    if (!anticipationConcern && !obviousnessConcern && !supportConcern) {
      allFindings.push({
        findingType: 'NO_MATERIAL_CONCERN',
        severity: 'LOW',
        title: `No substantial statutory overlap detected (Claim ${claimNum})`,
        explanation: `Evaluated claim limitations exhibit strong differentiation against both individual references (max coverage: ${Math.round(maxSingleCoverage * 100)}%) and collective prior-art combinations (${Math.round(collectivePriorArtCoverage * 100)}%).`,
        confidence: evidenceConfidence,
        claimNumber: claimNum,
        claimVersionNumber: versionNum,
        claimElementKeys: elementKeys,
        priorArtDocumentIds: topDoc ? [topDoc.id] : [],
        supportingFeatureKeys: effectiveFeatureKeys,
        evidence: [],
        recommendation:
          'Maintain current structural limitations during formal patent prosecution. Defensibility profile is favorable.',
        provenance: 'DETERMINISTIC',
      });
    }

    // Determine Claim Overall Risk
    let claimOverallRisk: RiskLevel = 'LOW';
    if (highestSeverity === 'CRITICAL') {
      claimOverallRisk = 'CRITICAL';
    } else if (highestSeverity === 'HIGH') {
      claimOverallRisk = 'HIGH';
    } else if (highestSeverity === 'MEDIUM') {
      claimOverallRisk = 'MEDIUM';
    } else {
      claimOverallRisk = 'LOW';
    }

    claimSummaries.push({
      claimNumber: claimNum,
      claimVersionNumber: versionNum,
      claimType: claim.claimType,
      overallRisk: claimOverallRisk,
      highestSeverity,
      findingsCount: allFindings.filter((f) => f.claimNumber === claimNum).length,
      anticipationConcern,
      obviousnessConcern,
      supportConcern,
      evidenceConfidence,
      singleReferenceCoverage: maxSingleCoverage,
      collectivePriorArtCoverage,
      effectiveFeaturesCount: k,
      effectiveFeatureKeys,
    });
  }

  // Calculate Overall Review Risk & Confidence across all claims
  let overallReviewRisk: RiskLevel = 'LOW';
  if (claimSummaries.some((c) => c.overallRisk === 'CRITICAL')) {
    overallReviewRisk = 'CRITICAL';
  } else if (claimSummaries.some((c) => c.overallRisk === 'HIGH')) {
    overallReviewRisk = 'HIGH';
  } else if (claimSummaries.some((c) => c.overallRisk === 'MEDIUM')) {
    overallReviewRisk = 'MEDIUM';
  }

  const avgConfidence = claimSummaries.length > 0
    ? Number(
        (
          claimSummaries.reduce((acc, c) => acc + c.evidenceConfidence, 0) /
          claimSummaries.length
        ).toFixed(4)
      )
    : 0.0;

  return {
    analysisRunId,
    inventionId,
    overallRisk: overallReviewRisk,
    confidence: avgConfidence,
    status: 'COMPLETED',
    claimSummaries,
    findings: allFindings,
    meta: {
      totalClaimsEvaluated: claimSummaries.length,
      independentCount: claimSummaries.filter((c) => c.claimType === 'INDEPENDENT').length,
      dependentCount: claimSummaries.filter((c) => c.claimType === 'DEPENDENT').length,
      totalFindings: allFindings.length,
      educationalNotice,
    },
  };
}

// ==============================================================================
// 6. Groq Explanation Polish (Anti-Hallucination Safe Boundary)
// ==============================================================================

const groqFindingExplanationSchema = z.object({
  explanations: z.array(
    z.object({
      claimNumber: z.number().int(),
      findingType: z.string(),
      improvedExplanation: z.string().min(10),
      improvedRecommendation: z.string().min(10),
    })
  ),
});

export async function enhanceExaminerFindingsWithGroq(
  findings: DeterministicExaminerFinding[],
  inventionTitle: string
): Promise<DeterministicExaminerFinding[]> {
  if (!isGroqConfigured() || findings.length === 0) {
    return findings;
  }

  const promptFindings = findings.map((f) => ({
    claimNumber: f.claimNumber,
    findingType: f.findingType,
    severity: f.severity,
    deterministicExplanation: f.explanation,
    deterministicRecommendation: f.recommendation,
    supportingFeatureKeys: f.supportingFeatureKeys,
  }));

  const prompt = `
You are an expert USPTO patent examiner assistant.
Improve the clarity and precision of these deterministic pre-filing examiner findings for invention: "${inventionTitle}".

CRITICAL INSTRUCTIONS:
- You MUST NOT change the finding types, claim numbers, or severity levels.
- You MUST NOT invent any new prior art, patent numbers, or technical features.
- Adhere to qualified non-legal language (e.g. "Potential single-reference anticipation concern", "Potential §103-style obviousness concern").
- DO NOT say "This claim is invalid" or "The patent is rejected".

Input Findings:
${JSON.stringify(promptFindings, null, 2)}

Return JSON matching:
{
  "explanations": [
    {
      "claimNumber": 1,
      "findingType": "POTENTIAL_ANTICIPATION",
      "improvedExplanation": "Refined professional examiner observation...",
      "improvedRecommendation": "Refined actionable claim drafting advice..."
    }
  ]
}
`.trim();

  try {
    const result = await generateStructuredCompletion<any>({
      prompt,
      systemPrompt:
        'You are an assistant to a USPTO patent examiner. Format strictly according to MPEP guidelines. Do not state absolute legal invalidity.',
      temperature: 0.1,
      jsonSchema: {
        name: 'examiner_explanation_enhancement',
        schema: {
          type: 'object',
          properties: {
            explanations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  claimNumber: { type: 'integer' },
                  findingType: { type: 'string' },
                  improvedExplanation: { type: 'string' },
                  improvedRecommendation: { type: 'string' },
                },
                required: ['claimNumber', 'findingType', 'improvedExplanation', 'improvedRecommendation'],
                additionalProperties: false,
              },
            },
          },
          required: ['explanations'],
          additionalProperties: false,
        },
      },
    });

    const parsed = groqFindingExplanationSchema.parse(result);
    const expMap = new Map<string, { explanation: string; recommendation: string }>();

    for (const item of parsed.explanations) {
      expMap.set(`${item.claimNumber}:${item.findingType}`, {
        explanation: item.improvedExplanation,
        recommendation: item.improvedRecommendation,
      });
    }

    return findings.map((f) => {
      const match = expMap.get(`${f.claimNumber}:${f.findingType}`);
      if (match) {
        return {
          ...f,
          explanation: match.explanation,
          recommendation: match.recommendation,
          provenance: 'GROQ_ASSISTED',
        };
      }
      return f;
    });
  } catch (err: any) {
    console.warn(
      '[Groq AI Warning] Examiner explanation polish via Groq failed, using deterministic grounding:',
      err?.message
    );
    return findings;
  }
}

// ==============================================================================
// 7. Relational Persistence & Idempotency
// ==============================================================================

/**
 * Persists an ExaminerReview and its ExaminerFinding records in PostgreSQL.
 * Strictly idempotent on analysisRunId: updates review and replaces child findings.
 */
export async function persistExaminerSimulation(
  reviewResult: DeterministicExaminerReviewResult
): Promise<any> {
  const {
    analysisRunId,
    inventionId,
    overallRisk,
    confidence,
    status,
    claimSummaries,
    findings,
  } = reviewResult;

  // Find existing review for this analysis run to ensure idempotency
  let existingReview = await prisma.examinerReview.findFirst({
    where: { analysisRunId },
  });

  if (!existingReview) {
    existingReview = await prisma.examinerReview.create({
      data: {
        analysisRunId,
        inventionId,
        overallRisk,
        status,
        confidence,
        claimReviews: claimSummaries as any,
        title: `Pre-Filing Examiner Simulation (${claimSummaries.length} claims evaluated)`,
        concern: findings[0]?.explanation || 'No material prior-art concerns identified.',
        recommendation: findings[0]?.recommendation || 'Proceed with formal application filing.',
      },
    });
  } else {
    existingReview = await prisma.examinerReview.update({
      where: { id: existingReview.id },
      data: {
        overallRisk,
        status,
        confidence,
        claimReviews: claimSummaries as any,
        title: `Pre-Filing Examiner Simulation (${claimSummaries.length} claims evaluated)`,
        concern: findings[0]?.explanation || 'No material prior-art concerns identified.',
        recommendation: findings[0]?.recommendation || 'Proceed with formal application filing.',
        updatedAt: new Date(),
      },
    });

    // Remove old findings for this review to prevent duplicates
    await prisma.examinerFinding.deleteMany({
      where: { examinerReviewId: existingReview.id },
    });
  }

  // Insert fresh findings
  for (const finding of findings) {
    await prisma.examinerFinding.create({
      data: {
        examinerReviewId: existingReview.id,
        findingType: finding.findingType,
        severity: finding.severity,
        title: finding.title,
        explanation: finding.explanation,
        confidence: finding.confidence,
        claimNumber: finding.claimNumber,
        claimVersionNumber: finding.claimVersionNumber,
        claimElementKeys: finding.claimElementKeys,
        priorArtDocumentIds: finding.priorArtDocumentIds,
        supportingFeatureKeys: finding.supportingFeatureKeys,
        evidence: finding.evidence as any,
        recommendation: finding.recommendation,
        provenance: finding.provenance,
      },
    });
  }

  // Fetch fully populated record with findings
  return prisma.examinerReview.findUnique({
    where: { id: existingReview.id },
    include: {
      findings: {
        orderBy: [{ claimNumber: 'asc' }, { severity: 'desc' }],
      },
      analysisRun: true,
      invention: true,
    },
  });
}

// ==============================================================================
// 8. End-to-End Examiner Simulation Coordinator
// ==============================================================================

/**
 * Coordinates fetching active data, executing deterministic simulation,
 * polishing wording with Groq (if available), and persisting to PostgreSQL.
 */
export async function executeExaminerSimulation(
  analysisRunId: string,
  inventionId?: string
): Promise<any> {
  // 1. Fetch AnalysisRun with related claims, features, prior art, matrix
  const run = await prisma.analysisRun.findUnique({
    where: { id: analysisRunId },
    include: {
      invention: true,
      inventionFeatures: true,
      claims: {
        orderBy: { claimNumber: 'asc' },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              elements: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      featureOverlapEntries: true,
      priorArtMatches: {
        include: {
          document: true,
        },
      },
    },
  });

  if (!run) {
    throw new Error(`AnalysisRun "${analysisRunId}" not found.`);
  }

  const effectiveInventionId = inventionId || run.inventionId;

  // 2. Map claims to ClaimForExaminer using latest version
  const claimsForExaminer: ClaimForExaminer[] = run.claims
    .filter((c) => c.versions.length > 0)
    .map((c) => {
      const latest = c.versions[0];
      return {
        id: c.id,
        claimNumber: c.claimNumber,
        claimType: c.claimType as 'INDEPENDENT' | 'DEPENDENT',
        parentClaimNumber: c.parentClaimNumber,
        title: c.title || `Claim ${c.claimNumber}`,
        latestVersion: {
          id: latest.id,
          versionNumber: latest.versionNumber,
          claimText: latest.claimText,
          elements: latest.elements.map((e) => ({
            elementKey: e.elementKey,
            text: e.text,
            featureKey: e.featureKey,
            elementType: e.elementType,
            inventionFeatureId: e.inventionFeatureId,
          })),
        },
      };
    });

  // 3. Map prior art documents
  const priorArtDocs: PriorArtForExaminer[] = run.priorArtMatches.map((m) => ({
    id: m.document.id,
    publicationNumber: m.document.publicationNumber,
    title: m.document.title,
    abstract: m.document.abstract || undefined,
    technologyDomain: (m.document.metadata as any)?.technologyDomain || undefined,
  }));

  // 4. Map matrix entries
  const matrixEntries: MatrixEntryForExaminer[] = run.featureOverlapEntries.map((m) => ({
    priorArtDocumentId: m.priorArtDocumentId,
    featureId: m.featureId,
    overlapStatus: m.overlapStatus,
    evidence: m.evidence,
    evidenceSource: m.evidenceSource,
  }));

  // 5. Map features
  const features: FeatureForExaminer[] = run.inventionFeatures.map((f) => ({
    id: f.id,
    featureKey: f.featureKey,
    name: f.name,
    description: f.description,
    isNovelty: f.isNovelty,
  }));

  // 6. Calculate deterministic examiner review
  const deterministicReview = calculateDeterministicExaminerReview(
    run.id,
    effectiveInventionId,
    claimsForExaminer,
    priorArtDocs,
    matrixEntries,
    features
  );

  // 7. Optional Groq Polish of explanations (maintains strict boundaries)
  if (isGroqConfigured() && deterministicReview.findings.length > 0) {
    try {
      deterministicReview.findings = await enhanceExaminerFindingsWithGroq(
        deterministicReview.findings,
        run.invention.title
      );
    } catch {
      // Continue with deterministic findings
    }
  }

  // 8. Persist to PostgreSQL
  return persistExaminerSimulation(deterministicReview);
}

// ==============================================================================
// 9. Query Helper
// ==============================================================================

export async function getExaminerReviewForAnalysis(analysisRunId: string, inventionId?: string) {
  return prisma.examinerReview.findFirst({
    where: {
      OR: [
        { analysisRunId },
        ...(inventionId ? [{ inventionId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      findings: {
        orderBy: [{ claimNumber: 'asc' }, { severity: 'desc' }],
      },
      analysisRun: true,
      invention: true,
    },
  });
}
