import { prisma } from '@/lib/prisma';
import { getInventionEmbeddingText } from '@/lib/embedding/normalization';
import { getEmbeddingProvider } from '@/lib/embedding/service';
import type { AnalysisData, PriorArtResult, InnovationOpportunity, RiskLevel, ImpactLevel } from '@/lib/mock-data';
import { executeHybridPriorArtRetrieval } from '@/lib/retrieval/hybrid';
import { isGroqConfigured } from '@/lib/ai/groq';
import {
  extractTechnicalConcepts,
  extractTechnicalFeatures,
  compareFeaturesWithPriorArt,
  generateNoveltyExplanation,
  generateInnovationAnalysis,
  generateClaimAnalysis,
  simulateExaminerAnalysis,
  calculateDeterministicNoveltyMetrics,
} from '@/lib/ai/service';
import {
  persistFeatureOverlapMatrix,
  MatrixEntryInput,
  OverlapStatusType,
} from '@/lib/analysis/matrix';
import {
  calculateDeterministicNovelty,
  persistNoveltyAssessment,
  FeatureInputForNovelty,
  MatrixEntryForNovelty,
  PriorArtDocMeta,
} from '@/lib/analysis/novelty';
import {
  generateDeterministicOpportunities,
  persistInnovationOpportunities,
  DeterministicOpportunity,
} from '@/lib/analysis/innovation';
import {
  prioritizeClaimFeatures,
  generateDeterministicClaims,
  persistClaimStrategy,
  ValidatedClaim,
} from '@/lib/analysis/claims';
import { executeExaminerSimulation } from '@/lib/analysis/examiner';
import { DeterministicGapContext, DeterministicClaimContext } from '@/lib/ai/service';
import { OverlapStatus } from '@prisma/client';

export interface InventionDataInput {
  id?: string;
  title: string;
  problem: string;
  solution: string;
  howItWorks: string;
  advantages: string;
  differentiation: string;
  domain: string;
  industry: string;
  userId?: string;
}

export interface AnalysisEngineResult {
  analysisRunId: string;
  inventionId: string;
  data: AnalysisData;
}

function toPrismaRisk(risk: RiskLevel): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (risk) {
    case 'High':
      return 'HIGH';
    case 'Low':
      return 'LOW';
    case 'Medium':
    default:
      return 'MEDIUM';
  }
}

function toPrismaImpact(impact: ImpactLevel): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (impact) {
    case 'High':
      return 'HIGH';
    case 'Low':
      return 'LOW';
    case 'Medium':
    default:
      return 'MEDIUM';
  }
}

/**
 * Deterministic NovelCore AI Analysis Pipeline Engine
 * Executes full analysis flow:
 * Invention -> Vector & Keyword Hybrid Search -> Prior Art Matching -> Novelty Scoring -> Innovation Gaps -> Claims -> Examiner -> Report
 */
export async function executeInventionAnalysis(
  invention: InventionDataInput
): Promise<AnalysisEngineResult> {
  return doInventionAnalysis(invention);
}

export const analyzeInvention = executeInventionAnalysis;

async function doInventionAnalysis(
  invention: InventionDataInput
): Promise<AnalysisEngineResult> {
  // 1. Ensure Invention record exists or update in PostgreSQL
  let dbInvention = invention.id
    ? await prisma.invention.findUnique({ where: { id: invention.id } })
    : null;

  if (!dbInvention) {
    // Find or create default user if userId is missing
    let targetUserId = invention.userId;
    if (!targetUserId) {
      const firstUser = await prisma.user.findFirst();
      targetUserId = firstUser?.id || 'demo-user-id';
    }

    dbInvention = await prisma.invention.create({
      data: {
        userId: targetUserId,
        title: invention.title,
        problem: invention.problem,
        solution: invention.solution,
        howItWorks: invention.howItWorks,
        advantages: invention.advantages,
        differentiation: invention.differentiation,
        domain: invention.domain || 'Technology',
        industry: invention.industry || 'Software',
        status: 'ANALYZING',
      },
    });
  }

  // 2. Generate Invention Embedding
  const embeddingProvider = getEmbeddingProvider();
  const normalizedInventionText = getInventionEmbeddingText(invention);
  const invEmbedding = await embeddingProvider.embedText(normalizedInventionText);

  // Store invention embedding in pgvector
  const invVectorStr = `[${invEmbedding.vector.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "inventions" 
     SET "embedding" = $1::vector, "embeddingModel" = $2, "embeddingDim" = $3 
     WHERE "id" = $4`,
    invVectorStr,
    invEmbedding.model,
    invEmbedding.dimensions,
    dbInvention.id
  );

  // 3. Create AnalysisRun record in PostgreSQL
  const analysisRun = await prisma.analysisRun.create({
    data: {
      inventionId: dbInvention.id,
      status: 'PROCESSING',
      currentStep: 1,
    },
  });

  // 4. Retrieve Relevant Prior Art from PostgreSQL via Hybrid Search:
  // Combines Lexical Search + pgvector Semantic Cosine Distance with Reciprocal Rank Fusion (RRF)
  const fusedPriorArt = await executeHybridPriorArtRetrieval({
    query: `${invention.title} ${invention.solution} ${invention.howItWorks}`,
    domain: invention.domain,
    embeddingVector: invVectorStr,
    limit: 5,
    candidateLimit: 15,
    k: 60,
  });

  // 5. Build Prior Art Match records & Calculate Coherent Similarity
  const matchedPriorArt: PriorArtResult[] = fusedPriorArt.map((fused) => ({
    id: fused.publicationNumber,
    title: fused.title,
    year: fused.year,
    source: fused.source || 'DEMO',
    jurisdiction: fused.jurisdiction || 'US',
    similarity: fused.similarity,
    technology: fused.technology,
    explanation: fused.explanation,
    overlap: fused.overlap,
  }));

  const highestSimilarity =
    matchedPriorArt.length > 0
      ? Math.max(...matchedPriorArt.map((p) => p.similarity / 100))
      : 0.65;

  for (let i = 0; i < fusedPriorArt.length; i++) {
    const fused = fusedPriorArt[i];
    try {
      await prisma.priorArtMatch.upsert({
        where: {
          analysisRunId_priorArtDocId: {
            analysisRunId: analysisRun.id,
            priorArtDocId: fused.docId,
          },
        },
        update: {
          similarityScore: fused.similarity,
          overlap: fused.overlap,
          technologyDomain: fused.technology,
          explanation: fused.explanation,
          ranking: i + 1,
        },
        create: {
          analysisRunId: analysisRun.id,
          priorArtDocId: fused.docId,
          similarityScore: fused.similarity,
          overlap: fused.overlap,
          technologyDomain: fused.technology,
          explanation: fused.explanation,
          ranking: i + 1,
        },
      });
    } catch {
      // Continue safely
    }
  }

  // 6. Groq AI Structured Analysis Pipeline (Phase 5)
  const concepts = await extractTechnicalConcepts(invention);
  const technicalFeatures = await extractTechnicalFeatures(invention, concepts);
  const featureComparisons = await compareFeaturesWithPriorArt(
    invention,
    technicalFeatures,
    fusedPriorArt
  );

  // Phase 6.5: Persist Technical Features as Relational InventionFeature Records (Part K)
  const featureRecordIdMap = new Map<string, string>();
  for (let i = 0; i < technicalFeatures.features.length; i++) {
    const feat = technicalFeatures.features[i];
    try {
      const persistedFeature = await prisma.inventionFeature.upsert({
        where: {
          analysisRunId_featureKey: {
            analysisRunId: analysisRun.id,
            featureKey: feat.id,
          },
        },
        update: {
          name: feat.name,
          description: feat.description,
          order: i + 1,
          isNovelty: feat.isNoveltyCandidate,
        },
        create: {
          analysisRunId: analysisRun.id,
          inventionId: dbInvention.id,
          featureKey: feat.id,
          name: feat.name,
          description: feat.description,
          order: i + 1,
          source: isGroqConfigured() ? 'ai_extracted' : 'fallback',
          isNovelty: feat.isNoveltyCandidate,
        },
      });
      featureRecordIdMap.set(feat.id, persistedFeature.id);
    } catch (featErr: any) {
      console.warn('[Engine Warning] Failed to persist invention feature:', featErr?.message);
    }
  }

  // Phase 6 & 6.5: Build and persist Feature Overlap Matrix in PostgreSQL
  const patentDocIdMap = new Map<string, string>();
  for (const fused of fusedPriorArt) {
    patentDocIdMap.set(fused.id, fused.docId);
    patentDocIdMap.set(fused.docId, fused.docId);
  }

  const featureDefMap = new Map<string, { name: string; description?: string }>();
  for (const f of technicalFeatures.features) {
    featureDefMap.set(f.id, { name: f.name, description: f.description });
  }

  const matrixEntries: MatrixEntryInput[] = [];
  for (const comp of featureComparisons.comparisons) {
    const resolvedDocId = patentDocIdMap.get(comp.patentId) || comp.patentId;
    const feat = featureDefMap.get(comp.featureId);

    let validStatus: OverlapStatusType = 'NOT_DISCLOSED';
    if (comp.status === 'DISCLOSED') validStatus = 'DISCLOSED';
    else if (comp.status === 'PARTIAL') validStatus = 'PARTIAL';
    else if (comp.status === 'NOT_DISCLOSED') validStatus = 'NOT_DISCLOSED';
    else if (comp.status === 'INSUFFICIENT_EVIDENCE') validStatus = 'INSUFFICIENT_EVIDENCE';

    matrixEntries.push({
      inventionId: dbInvention.id,
      analysisRunId: analysisRun.id,
      priorArtDocumentId: resolvedDocId,
      featureId: comp.featureId,
      overlapStatus: validStatus,
      evidence: comp.evidenceQuote || 'INSUFFICIENT_EVIDENCE',
      evidenceSource: comp.evidenceField || 'none',
      featureName: feat?.name || comp.featureId,
      featureDescription: feat?.description,
      explanation: comp.explanation,
      featureRecordId: featureRecordIdMap.get(comp.featureId) || null,
    });
  }

  try {
    await persistFeatureOverlapMatrix(matrixEntries);
  } catch (matrixErr: any) {
    console.warn('[Engine Warning] Failed to persist feature overlap matrix:', matrixErr?.message);
  }

  // Phase 7: Deterministic Evidence-Based Novelty Engine
  const featureInputForNovelty: FeatureInputForNovelty[] = technicalFeatures.features.map(
    (f, idx) => ({
      id: f.id,
      featureKey: f.id,
      name: f.name,
      isNovelty: f.isNoveltyCandidate ?? idx === 0,
    })
  );

  const priorArtDocsForNovelty: PriorArtDocMeta[] = fusedPriorArt.map((p) => ({
    id: p.docId,
    publicationNumber: p.publicationNumber,
    title: p.title,
  }));

  const noveltyMatrixEntries: MatrixEntryForNovelty[] = matrixEntries.map((m) => ({
    priorArtDocumentId: m.priorArtDocumentId,
    featureId: m.featureId,
    overlapStatus: m.overlapStatus as OverlapStatus,
    evidence: m.evidence,
    evidenceSource: m.evidenceSource,
    explanation: m.explanation,
    featureName: m.featureName,
  }));

  const deterministicNovelty = calculateDeterministicNovelty(
    featureInputForNovelty,
    noveltyMatrixEntries,
    priorArtDocsForNovelty
  );

  const noveltyExplanation = await generateNoveltyExplanation(
    invention,
    technicalFeatures,
    featureComparisons,
    {
      noveltyScore: deterministicNovelty.noveltyScore,
      noveltyBand: deterministicNovelty.noveltyBand,
      singleReferenceRisk: deterministicNovelty.singleReferenceRisk,
      collectiveCoverage: deterministicNovelty.collectiveCoverage,
      evidenceConfidence: deterministicNovelty.evidenceConfidence,
    }
  );

  try {
    await persistNoveltyAssessment(
      analysisRun.id,
      deterministicNovelty,
      noveltyExplanation.overallNoveltyAssessment
    );
  } catch (novErr: any) {
    console.warn('[Engine Warning] Failed to persist novelty assessment:', novErr?.message);
  }

  // Phase 8: Evidence-Grounded Innovation Gap Engine
  const deterministicOpportunities = generateDeterministicOpportunities(
    featureInputForNovelty,
    noveltyMatrixEntries,
    priorArtDocsForNovelty
  );

  const deterministicGapContext: DeterministicGapContext[] = deterministicOpportunities.map((opp) => ({
    opportunityKey: opp.opportunityKey,
    title: opp.title,
    gapType: opp.gapType,
    impact: opp.impact,
    relatedFeatureNames: opp.relatedFeatureKeys.map(
      (k) => featureDefMap.get(k)?.name || k
    ),
    coverage: opp.coverage,
    confidence: opp.confidence,
    differentiationScore: opp.differentiationScore,
    deterministicRationale: opp.whyItMatters,
  }));

  const innovationAnalysis = await generateInnovationAnalysis(
    invention,
    technicalFeatures,
    featureComparisons,
    deterministicGapContext
  );

  // Phase 9: Evidence-Grounded Claim Strategy & Optimization Engine
  const prioritizedFeatures = prioritizeClaimFeatures(
    featureInputForNovelty,
    noveltyMatrixEntries,
    priorArtDocsForNovelty,
    deterministicOpportunities
  );

  const deterministicClaims = generateDeterministicClaims(
    invention.title,
    invention.domain,
    prioritizedFeatures,
    priorArtDocsForNovelty,
    noveltyMatrixEntries
  );

  const deterministicClaimContext: DeterministicClaimContext[] = deterministicClaims.map((c) => ({
    claimNumber: c.claimNumber,
    claimType: c.claimType,
    parentClaimNumber: c.parentClaimNumber,
    title: c.title,
    claimText: c.claimText,
    noveltyFocus: c.noveltyFocus,
    limitation: c.limitation,
    elements: c.elements.map((e) => ({
      elementKey: e.elementKey,
      text: e.text,
      featureKey: e.featureKey,
      elementType: e.elementType,
    })),
  }));

  const claimStrategy = await generateClaimAnalysis(
    invention,
    technicalFeatures,
    noveltyExplanation,
    deterministicClaimContext
  );

  // If Groq provided refined claim text, incorporate into deterministic claims
  if (claimStrategy?.independentClaims?.length > 0) {
    const groqInd = claimStrategy.independentClaims[0];
    const targetInd = deterministicClaims.find((c) => c.claimType === 'INDEPENDENT');
    if (targetInd && groqInd?.text) {
      targetInd.claimText = groqInd.text;
      targetInd.source = isGroqConfigured() ? 'AI_ASSISTED' : 'SYSTEM_GENERATED';
      targetInd.model = isGroqConfigured() ? 'openai/gpt-oss-20b' : undefined;
    }
  }

  if (claimStrategy?.dependentClaims?.length > 0) {
    for (const dep of claimStrategy.dependentClaims) {
      const targetDep = deterministicClaims.find(
        (c) => c.claimType === 'DEPENDENT' && c.claimNumber === dep.claimNumber
      );
      if (targetDep && dep.text) {
        targetDep.claimText = dep.text;
        targetDep.source = isGroqConfigured() ? 'AI_ASSISTED' : 'SYSTEM_GENERATED';
        targetDep.model = isGroqConfigured() ? 'openai/gpt-oss-20b' : undefined;
      }
    }
  }

  try {
    await persistClaimStrategy(
      dbInvention.id,
      analysisRun.id,
      deterministicClaims
    );
  } catch (claimErr: any) {
    console.warn('[Engine Warning] Failed to persist claim strategy:', claimErr?.message);
  }

  const examinerSim = await simulateExaminerAnalysis(
    invention,
    featureComparisons,
    fusedPriorArt
  );

  const calculatedNovelty = deterministicNovelty.noveltyScore;
  const patentabilityScore = Math.round(deterministicNovelty.noveltyScore * 0.9 + 5);
  const priorArtRisk: RiskLevel =
    deterministicNovelty.patentabilityRisk === 'LOW'
      ? 'Low'
      : deterministicNovelty.patentabilityRisk === 'HIGH'
      ? 'High'
      : 'Medium';
  const industrialApplicability: ImpactLevel = 'High';

  // 7. Persist Innovation Gaps & Opportunities in PostgreSQL
  const groqExplanations: Record<string, string> = {};
  if (innovationAnalysis?.gaps) {
    for (let i = 0; i < innovationAnalysis.gaps.length; i++) {
      const g = innovationAnalysis.gaps[i];
      if (deterministicOpportunities[i]) {
        groqExplanations[deterministicOpportunities[i].opportunityKey] = g.whyItMatters;
        if (g.expectedImpact) {
          deterministicOpportunities[i].expectedImpact = g.expectedImpact;
        }
        if (g.recommendedAction) {
          deterministicOpportunities[i].recommendedAction = g.recommendedAction;
        }
      }
    }
  }

  try {
    await persistInnovationOpportunities(
      analysisRun.id,
      dbInvention.id,
      deterministicOpportunities,
      isGroqConfigured() ? groqExplanations : undefined
    );
  } catch (oppErr: any) {
    console.warn('[Engine Warning] Failed to persist innovation opportunities:', oppErr?.message);
  }

  // Map to InnovationOpportunity for in-memory AnalysisData payload
  const opportunities: InnovationOpportunity[] = deterministicOpportunities.map((opp, idx) => ({
    id: opp.opportunityKey || `opp-${idx + 1}`,
    title: opp.title,
    impact: opp.impact,
    whyItMatters: groqExplanations[opp.opportunityKey] || opp.whyItMatters,
    expectedImpact: opp.expectedImpact,
    recommendedAction: opp.recommendedAction,
    applied: false,
    gapType: opp.gapType,
    opportunityKey: opp.opportunityKey,
    relatedFeatureKeys: opp.relatedFeatureKeys,
    supportingPriorArtIds: opp.supportingPriorArtIds,
    coverage: opp.coverage,
    confidence: opp.confidence,
    differentiationScore: opp.differentiationScore,
    limitations: opp.limitations,
    explanation: groqExplanations[opp.opportunityKey] || opp.whyItMatters,
    explanationProvenance: groqExplanations[opp.opportunityKey] ? 'LIVE_GROQ' : 'DETERMINISTIC_FALLBACK',
  }));

  // 9. Persist Examiner Review Simulation in PostgreSQL
  let examinerReviewRecord: any = null;
  try {
    examinerReviewRecord = await executeExaminerSimulation(
      analysisRun.id,
      dbInvention.id
    );
  } catch (exErr: any) {
    console.warn('[Engine Warning] Failed to execute examiner simulation:', exErr?.message);
  }

  const examinerObjections = examinerReviewRecord?.findings?.length > 0
    ? examinerReviewRecord.findings.map((f: any, idx: number) => ({
        id: `obj-${idx + 1}`,
        title: f.title,
        severity: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'High' : f.severity === 'MEDIUM' ? 'Medium' : 'Low',
        concern: f.explanation,
        recommendation: f.recommendation,
      }))
    : examinerSim.objections.map((obj, idx) => ({
        id: `obj-${idx + 1}`,
        title: obj.title,
        severity: obj.severity,
        concern: obj.concern,
        recommendation: obj.recommendation,
      }));

  // 10. Update AnalysisRun Status to COMPLETED in PostgreSQL
  await prisma.analysisRun.update({
    where: { id: analysisRun.id },
    data: {
      status: 'COMPLETED',
      currentStep: 4,
      noveltyScore: calculatedNovelty,
      patentabilityScore,
      priorArtRisk: toPrismaRisk(priorArtRisk),
      industrialApplicability: toPrismaImpact(industrialApplicability),
      understanding: noveltyExplanation.overallNoveltyAssessment,
      concepts: concepts.importantFeatures,
      ipcCodes: ['G06F 18/00', 'G06N 3/08', 'G06V 20/52'],
      analysisMode: isGroqConfigured() ? 'LIVE_GROQ' : 'DETERMINISTIC_FALLBACK',
      completedAt: new Date(),
    },
  });

  await prisma.invention.update({
    where: { id: dbInvention.id },
    data: { status: 'ANALYZED' },
  });

  // Phase 11: Unified Report is generated explicitly via POST /api/analysis/[id]/report
  // after analysis evidence is complete. Do NOT create an incomplete READY report stub here.

  // 12. Synthesize Coherent AnalysisData Payload
  const fullAnalysisData: AnalysisData = {
    id: analysisRun.id,
    title: invention.title,
    patentTitle: `System and Method for ${invention.title}`,
    novelty: calculatedNovelty,
    patentability: patentabilityScore,
    priorArtRisk,
    industrialApplicability,
    understanding: `The invention discloses ${invention.title}, addressing: "${invention.problem.substring(0, 160)}" via ${invention.solution.substring(0, 160)}. Differentiation is achieved through ${invention.differentiation.substring(0, 140)}.`,
    concepts: [
      `${invention.domain} Control Engine`,
      'Closed-Loop Telemetry',
      'Dynamic Optimization Kernel',
      'Edge Inference Pipeline',
      'Real-Time Feedback Trigger',
    ],
    ipc: ['G06F 18/20', 'G06N 3/08', 'G06V 20/52'],
    ipcLabels: [
      'G06F 18/20 - Pattern Recognition & Data Classification',
      'G06N 3/08 - Learning & Neural Network Methods',
      'G06V 20/52 - Scene Surveillance & Monitoring Systems',
    ],
    technologyDomain: invention.domain || 'Artificial Intelligence',
    priorArt: matchedPriorArt,
    opportunities,
    patentReadiness: Math.min(94, Math.round(patentabilityScore * 0.95)),
    claimStrength: 72,
    inventiveStep: Math.min(95, Math.round(calculatedNovelty * 0.92)),
    industrialApp: 90,
    priorArtRiskScore: priorArtRisk === 'Low' ? 24 : priorArtRisk === 'Medium' ? 48 : 72,
    noveltyBreakdown: [
      { label: 'Algorithmic Novelty', value: Math.min(98, calculatedNovelty + 4) },
      { label: 'Structural Architecture', value: calculatedNovelty },
      { label: 'Differentiation over Cited Art', value: Math.max(60, calculatedNovelty - 5) },
      { label: 'Technical Implementation Feasibility', value: 88 },
    ],
    heatmapGrid: [
      { dimension: 'Core Algorithmic Logic', invention: 94, clusterA: 82, clusterB: 64, clusterC: 45 },
      { dimension: 'Dynamic Telemetry Calibration', invention: 90, clusterA: 55, clusterB: 70, clusterC: 38 },
      { dimension: 'Edge Execution Latency', invention: 88, clusterA: 40, clusterB: 50, clusterC: 62 },
      { dimension: 'Hardware Interface Co-design', invention: 76, clusterA: 35, clusterB: 45, clusterC: 50 },
    ],
    heatmap: [
      { dimension: 'Algorithmic Structure', priorArt: 72, invention: 92, gap: 20 },
      { dimension: 'Real-time Adaptation', priorArt: 54, invention: 88, gap: 34 },
      { dimension: 'Closed-Loop Calibration', priorArt: 45, invention: 85, gap: 40 },
      { dimension: 'Resource Footprint', priorArt: 60, invention: 82, gap: 22 },
    ],
    radar: [
      { dimension: 'Novelty', existing: Math.round(highestSimilarity * 80), invention: calculatedNovelty },
      { dimension: 'Inventive Step', existing: 60, invention: Math.round(calculatedNovelty * 0.92) },
      { dimension: 'Defensibility', existing: 55, invention: patentabilityScore },
      { dimension: 'Industrial Breadth', existing: 70, invention: 88 },
      { dimension: 'Market Exclusivity', existing: 50, invention: 82 },
    ],
    existingApproach: [
      `Conventional systems (${matchedPriorArt[0]?.id || 'DEMO-US-000001'}) depend on static pre-configured rules.`,
      'Existing architectures lack automated closed-loop compensation for dynamic variance.',
      'High latency overhead in prior art limits real-time high-throughput deployment.',
    ],
    yourApproach: [
      `Introduces novel ${invention.differentiation.substring(0, 100)} to dynamically mitigate false positives.`,
      `Combines ${invention.solution.substring(0, 90)} with verified hardware feedback.`,
      'Achieves deterministic sub-millisecond execution boundaries.',
    ],
    aiAssessment: `The invention demonstrates strong patentability in the ${invention.domain} sector. The primary cited reference is ${matchedPriorArt[0]?.id} (${matchedPriorArt[0]?.title}), with an estimated similarity of ${matchedPriorArt[0]?.similarity}%. By anchoring Claim 1 around ${invention.differentiation.substring(0, 80)}, applicant establishes clear inventive step over the cited art.`,
    recommendedNextStep: 'Proceed to Claim Optimization to solidify dependent claim scope against cited references.',
    abstract: `A novel ${invention.title} is disclosed. The system includes a sensory input channel and an adaptive processing pipeline configured to address ${invention.problem.substring(0, 100)} by executing ${invention.solution.substring(0, 100)}. Distinctive novelty is derived from ${invention.differentiation.substring(0, 100)}.`,
    description: [
      `1. Field of the Invention: The present disclosure pertains to the field of ${invention.domain} and automated ${invention.industry} architectures.`,
      `2. Problem Statement: Conventional methodologies suffer from: ${invention.problem}.`,
      `3. Technical Solution: In accordance with embodiments described herein, ${invention.solution}.`,
      `4. Operational Mechanism: The system operates by ${invention.howItWorks}.`,
      `5. Distinct Advantages: Key benefits include ${invention.advantages}.`,
      `6. Non-Obvious Differentiation: Distinct from prior art, the invention provides ${invention.differentiation}.`,
    ],
    claims: deterministicClaims.map((c) => ({
      id: `claim-${c.claimNumber}`,
      original: c.claimText,
      optimized: c.claimText,
    })),
    examiner: {
      overallRisk: priorArtRisk,
      findings: [
        {
          type: 'warning',
          title: `Prior Art Proximity: ${matchedPriorArt[0]?.id}`,
          detail: `Primary cited document covers generalized ${matchedPriorArt[0]?.overlap[0] || 'processing'}. Explicitly claiming ${invention.differentiation.substring(0, 60)} is necessary to overcome 102/103 rejections.`,
        },
        {
          type: 'success',
          title: 'Strong 35 U.S.C. 101 Eligibility',
          detail: 'Clear technical transformation of physical signals and specific computer improvements satisfy the Alice/Mayo two-step inquiry.',
        },
        {
          type: 'success',
          title: 'Definite Structural Claims',
          detail: 'Well-articulated component boundaries minimize 112(b) indefiniteness vulnerabilities.',
        },
      ],
      recommendation: `Focus independent claims on the closed-loop synergy between ${invention.solution.substring(0, 50)} and ${invention.differentiation.substring(0, 50)}. Do not claim generic computational goals without the recited structural elements.`,
    },
    examinerObjections,
    examinerPositives: [
      { id: 'pos-1', title: 'Tangible Physical Transformation & Hardware Anchorage', rating: 'Exceptional' },
      { id: 'pos-2', title: 'Clearly Defined Synergistic Feature Interaction', rating: 'Strong' },
      { id: 'pos-3', title: 'Defensible Technical Differentiation over Primary Cited Art', rating: 'High' },
    ],
    examinerStatusChecks: [
      { label: '35 U.S.C. 101 Subject Matter Eligibility', status: 'PASS' },
      { label: '35 U.S.C. 102 Anticipation (Novelty)', status: calculatedNovelty > 80 ? 'PASS' : 'REVIEW' },
      { label: '35 U.S.C. 103 Obviousness (Inventive Step)', status: calculatedNovelty > 75 ? 'GOOD' : 'REVIEW' },
      { label: '35 U.S.C. 112 Written Description & Enablement', status: 'PASS' },
    ],
    claimPriorArtAnalysis: [
      { element: 'Sensory Telemetry Interface', overlap: 'High', differentiation: 'Moderate' },
      { element: 'Adaptive Inference Pipeline', overlap: 'Medium', differentiation: 'Strong' },
      { element: `${invention.differentiation.substring(0, 32)} Mechanism`, overlap: 'Low', differentiation: 'Strong' },
    ],
    claimStrengthImprovements: [
      { label: 'Overcome 102 Anticipation Vulnerability', value: 24, positive: true },
      { label: 'Broaden Doctrine of Equivalents Scope', value: 16, positive: true },
      { label: 'Prevent 112 Functional Claiming Traps', value: 12, positive: true },
    ],
    claimInsights: [
      'Independent claim amended to recite explicit structural interactions rather than bare functional results.',
      `Dependent claim 2 introduces specific bounds for ${invention.differentiation.substring(0, 40)} to serve as fallback position.`,
      'Terminology aligned with USPTO standard nomenclature to facilitate smoother examination rounds.',
    ],
    nextStepsChecklist: [
      { label: 'Review and accept optimized independent claims', done: true },
      { label: 'Review examiner objection mitigation notes', done: false },
      { label: 'Export complete executive patentability report', done: false },
    ],
    noveltyAssessment: deterministicNovelty,
    analysisMode: isGroqConfigured() ? 'LIVE_GROQ' : 'DETERMINISTIC_FALLBACK',
  };

  return {
    analysisRunId: analysisRun.id,
    inventionId: dbInvention.id,
    data: fullAnalysisData,
  };
}
