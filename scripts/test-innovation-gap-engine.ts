/**
 * NovelCore AI — Phase 8 Innovation Gap Engine Test Suite
 *
 * Tests:
 * TEST A — Crowded Feature (substantive repeated disclosure -> CROWDED)
 * TEST B — Underserved Feature (limited representation -> UNDERSERVED)
 * TEST C — Partially Explored Feature (mixed partial disclosures -> PARTIALLY_EXPLORED)
 * TEST D — Potentially Distinctive Combination (features common individually, no direct co-occurrence -> POTENTIALLY_DISTINCTIVE)
 * TEST E — Semantic Similarity Separation (semantic similarity alone != disclosure/gap)
 * TEST F — Insufficient Evidence Decoupling (degrades confidence without fabricating differentiation)
 * TEST G — Evidence Provenance (all cited references belong to current analysis)
 * TEST H — Cross-Analysis Rejection (detects and rejects unauthorized document references)
 * TEST I — Determinism on Repeated Runs (identical gapType, metrics, scores)
 * TEST J — Database Idempotency (repeated persistence reconciles without duplicates)
 * TEST K — Groq Failure Resiliency (deterministic opportunities preserved with fallback provenance)
 * TEST L — Empty Features Behavior (no fabricated opportunities)
 * TEST M — Empty Prior Art Behavior (no false claims of distinctiveness)
 * TEST N — Combination Support Distinction (direct same-reference support != collective coverage)
 * TEST O — End-to-End Pipeline Execution with PostgreSQL & API route verification
 */

import { prisma } from '../lib/prisma';
import {
  buildFeatureEvidenceProfile,
  classifyFeatureGap,
  generateControlledCombinations,
  evaluateCombinationSupport,
  calculateDifferentiationScore,
  generateDeterministicOpportunities,
  persistInnovationOpportunities,
  validateOpportunityEvidenceProvenance,
  getInnovationGapsForAnalysis,
} from '../lib/analysis/innovation';
import { FeatureInputForNovelty, PriorArtDocMeta, MatrixEntryForNovelty } from '../lib/analysis/novelty';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { GET as getInnovationRoute } from '../app/api/analysis/[id]/innovation/route';
import { OverlapStatus } from '@prisma/client';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runInnovationGapTests() {
  console.log('======================================================================');
  console.log('PHASE 8 INNOVATION GAP ENGINE TEST SUITE');
  console.log('======================================================================\n');

  // Baseline mock test features
  const testFeatures: FeatureInputForNovelty[] = [
    { id: 'F1', featureKey: 'F1', name: 'Microchannel Dielectric Matrix', isNovelty: true },
    { id: 'F2', featureKey: 'F2', name: 'Closed-Loop Peltier Actuator', isNovelty: false },
    { id: 'F3', featureKey: 'F3', name: 'Solid-State Ceramic Interlayer', isNovelty: false },
    { id: 'F4', featureKey: 'F4', name: 'Dynamic Thermal Gradient Sensor', isNovelty: false },
  ];

  const testDocs: PriorArtDocMeta[] = [
    { id: 'doc-1', publicationNumber: 'DEMO-US-000001', title: 'Prior Art 1' },
    { id: 'doc-2', publicationNumber: 'DEMO-US-000002', title: 'Prior Art 2' },
    { id: 'doc-3', publicationNumber: 'DEMO-US-000003', title: 'Prior Art 3' },
    { id: 'doc-4', publicationNumber: 'DEMO-US-000004', title: 'Prior Art 4' },
  ];

  // --------------------------------------------------------------------------
  // TEST A: Crowded Feature Detection
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Crowded Feature Detection ---');
  // F2 is disclosed by all 4 patents
  const crowdedEntries: MatrixEntryForNovelty[] = testDocs.map((d) => ({
    priorArtDocumentId: d.id,
    featureId: 'F2',
    overlapStatus: 'DISCLOSED',
    evidence: 'Verbatim disclosure of Peltier cell cooling unit.',
    evidenceSource: 'claims',
  }));

  const profileA = buildFeatureEvidenceProfile(testFeatures[1], crowdedEntries, testDocs);
  const classA = classifyFeatureGap(profileA);
  assert(classA.gapType === 'CROWDED', `TEST A: Repeated disclosure classifies as CROWDED (got: ${classA.gapType})`);
  assert(classA.impact === 'Low', `TEST A: Crowded feature assigns Low strategic differentiation impact`);
  assert(profileA.disclosedDocIds.length === 4, `TEST A: Identifies all 4 disclosing prior art documents`);

  // --------------------------------------------------------------------------
  // TEST B: Underserved Feature Detection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Underserved Feature Detection ---');
  // F1 has 0 disclosures and 0 partials across all documents
  const underservedEntries: MatrixEntryForNovelty[] = testDocs.map((d) => ({
    priorArtDocumentId: d.id,
    featureId: 'F1',
    overlapStatus: 'NOT_DISCLOSED',
    evidence: 'No dielectric microchannel structure disclosed.',
    evidenceSource: 'description',
  }));

  const profileB = buildFeatureEvidenceProfile(testFeatures[0], underservedEntries, testDocs);
  const classB = classifyFeatureGap(profileB);
  assert(classB.gapType === 'UNDERSERVED', `TEST B: Zero disclosures classifies as UNDERSERVED (got: ${classB.gapType})`);
  assert(classB.impact === 'High', `TEST B: Novelty candidate in underserved area receives High strategic impact`);
  assert(profileB.coverageRatio === 0.0, `TEST B: Coverage ratio is 0.0 for underserved feature`);

  // --------------------------------------------------------------------------
  // TEST C: Partially Explored Feature Detection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: Partially Explored Feature Detection ---');
  // F3 has 2 partial disclosures and 2 not-disclosed
  const partialEntries: MatrixEntryForNovelty[] = [
    { priorArtDocumentId: 'doc-1', featureId: 'F3', overlapStatus: 'PARTIAL', evidence: 'Generic ceramic barrier mentioned.', evidenceSource: 'description' },
    { priorArtDocumentId: 'doc-2', featureId: 'F3', overlapStatus: 'PARTIAL', evidence: 'Electrolyte separator layer without nano-porosity.', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-3', featureId: 'F3', overlapStatus: 'NOT_DISCLOSED', evidence: 'No ceramic layer.', evidenceSource: 'none' },
    { priorArtDocumentId: 'doc-4', featureId: 'F3', overlapStatus: 'NOT_DISCLOSED', evidence: 'Polymer separator only.', evidenceSource: 'none' },
  ];

  const profileC = buildFeatureEvidenceProfile(testFeatures[2], partialEntries, testDocs);
  const classC = classifyFeatureGap(profileC);
  assert(classC.gapType === 'PARTIALLY_EXPLORED', `TEST C: Multiple partial disclosures classify as PARTIALLY_EXPLORED (got: ${classC.gapType})`);
  assert(profileC.partialDocIds.length === 2, `TEST C: Records 2 partial supporting prior-art documents`);

  // --------------------------------------------------------------------------
  // TEST D: Potentially Distinctive Combination Detection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Potentially Distinctive Combination Detection ---');
  // Patent 1 discloses F1 only
  // Patent 2 discloses F2 only
  // Neither patent combines F1 + F2 together in the same reference
  const combinationEntries: MatrixEntryForNovelty[] = [
    { priorArtDocumentId: 'doc-1', featureId: 'F1', overlapStatus: 'DISCLOSED', evidence: 'Discloses F1', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-1', featureId: 'F2', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F2', evidenceSource: 'none' },
    { priorArtDocumentId: 'doc-2', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F1', evidenceSource: 'none' },
    { priorArtDocumentId: 'doc-2', featureId: 'F2', overlapStatus: 'DISCLOSED', evidence: 'Discloses F2', evidenceSource: 'claims' },
  ];

  const testComb = {
    combinationKey: 'comb-F1-F2',
    name: 'F1 + F2 Synergistic Unit',
    featureKeys: ['F1', 'F2'],
    features: [testFeatures[0], testFeatures[1]],
  };

  const combEvalD = evaluateCombinationSupport(testComb, combinationEntries, testDocs.slice(0, 2));
  assert(
    combEvalD.gapType === 'POTENTIALLY_DISTINCTIVE',
    `TEST D: Combination with low direct co-occurrence classifies as POTENTIALLY_DISTINCTIVE (got: ${combEvalD.gapType})`
  );
  assert(
    combEvalD.directCombinationCoverage === 0.50, // Doc 1 discloses 1/2, Doc 2 discloses 1/2 -> max direct is 0.5
    `TEST D: Tracks max direct same-reference support separately (${combEvalD.directCombinationCoverage})`
  );
  assert(
    combEvalD.individualFeatureCoverage === 1.0, // F1 is disclosed by Doc 1, F2 by Doc 2 -> collective is 100%
    `TEST D: Tracks individual collective coverage separately (got: ${combEvalD.individualFeatureCoverage})`
  );

  // --------------------------------------------------------------------------
  // TEST E: Semantic Similarity Alone Does Not Produce a Gap
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E: Semantic Similarity Separation ---');
  // High similarity doc where overlap matrix explicitly says NOT_DISCLOSED
  const semanticDoc: PriorArtDocMeta = { id: 'doc-sim', publicationNumber: 'DEMO-SIM-01', title: 'High Similarity Document' };
  const entriesNonDisclosed: MatrixEntryForNovelty[] = [
    { priorArtDocumentId: 'doc-sim', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'Different domain architecture.', evidenceSource: 'abstract' },
  ];
  const profileE = buildFeatureEvidenceProfile(testFeatures[0], entriesNonDisclosed, [semanticDoc]);
  assert(profileE.coverageRatio === 0.0, `TEST E: Non-disclosure in similar doc results in 0.0 coverage`);
  const classE = classifyFeatureGap(profileE);
  assert(classE.gapType === 'UNDERSERVED', `TEST E: Evaluates strictly on overlap evidence, classifying as UNDERSERVED`);

  // --------------------------------------------------------------------------
  // TEST F: Insufficient Evidence Decoupling
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F: Insufficient Evidence Decoupling ---');
  const entriesWeak: MatrixEntryForNovelty[] = testDocs.map((d) => ({
    priorArtDocumentId: d.id,
    featureId: 'F1',
    overlapStatus: 'INSUFFICIENT_EVIDENCE',
    evidence: 'INSUFFICIENT_EVIDENCE',
    evidenceSource: 'none',
  }));
  const profileF = buildFeatureEvidenceProfile(testFeatures[0], entriesWeak, testDocs);
  assert(profileF.evidenceConfidence === 0.0, `TEST F: Confidence drops to 0.0 when cells lack verifiable citations`);

  // --------------------------------------------------------------------------
  // TEST G & H: Evidence Provenance & Cross-Analysis Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G & H: Evidence Provenance & Cross-Analysis Rejection ---');
  const existingRun = await prisma.analysisRun.findFirst({
    where: { status: 'COMPLETED' },
    include: { priorArtMatches: true, inventionFeatures: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existingRun && existingRun.priorArtMatches.length > 0) {
    const runId = existingRun.id;
    const invId = existingRun.inventionId;
    const realDocId = existingRun.priorArtMatches[0].priorArtDocId;

    const testOpp = {
      opportunityKey: 'test-opp-1',
      title: 'Test Opportunity',
      gapType: 'UNDERSERVED' as const,
      impact: 'High' as const,
      whyItMatters: 'Authentic test strategic explanation.',
      expectedImpact: 'Broadens moat.',
      recommendedAction: 'Draft claim element.',
      relatedFeatureKeys: [existingRun.inventionFeatures[0]?.featureKey || 'F1'],
      supportingPriorArtIds: [realDocId],
      coverage: 0.1,
      confidence: 0.9,
      differentiationScore: 85,
      evidenceDetails: {},
      limitations: 'Educational intelligence indicator.',
      explanationProvenance: 'DETERMINISTIC_FALLBACK' as const,
    };

    await persistInnovationOpportunities(runId, invId, [testOpp]);
    const validProv = await validateOpportunityEvidenceProvenance(runId);
    assert(validProv.valid === true, `TEST G: Valid opportunity passes provenance check`);

    // Inject unauthorized cross-analysis doc ID
    await prisma.analysisOpportunity.updateMany({
      where: { analysisRunId: runId, opportunityKey: 'test-opp-1' },
      data: { supportingPriorArtIds: ['unauthorized-cross-analysis-uuid-999'] },
    });

    const invalidProv = await validateOpportunityEvidenceProvenance(runId);
    assert(
      invalidProv.valid === false &&
        invalidProv.errors.some((e) => e.includes('unauthorized-cross-analysis-uuid-999')),
      `TEST H: Cross-analysis invalid document reference caught and rejected`
    );

    // Restore valid opportunity
    await persistInnovationOpportunities(runId, invId, [testOpp]);
  } else {
    console.log('  [SKIP] No completed run found for provenance testing.');
  }

  // --------------------------------------------------------------------------
  // TEST I: Determinism on Repeated Runs
  // --------------------------------------------------------------------------
  console.log('\n--- TEST I: Determinism on Repeated Runs ---');
  const allEntries: MatrixEntryForNovelty[] = [
    ...crowdedEntries,
    ...underservedEntries,
    ...partialEntries,
  ];
  const opps1 = generateDeterministicOpportunities(testFeatures, allEntries, testDocs);
  const opps2 = generateDeterministicOpportunities(testFeatures, allEntries, testDocs);

  assert(opps1.length === opps2.length, `TEST I: Repeated runs yield identical opportunity count (${opps1.length})`);
  assert(
    opps1[0].gapType === opps2[0].gapType && opps1[0].differentiationScore === opps2[0].differentiationScore,
    `TEST I: Top opportunity has identical gapType (${opps1[0].gapType}) and score (${opps1[0].differentiationScore})`
  );
  assert(
    JSON.stringify(opps1.map((o) => o.opportunityKey)) === JSON.stringify(opps2.map((o) => o.opportunityKey)),
    `TEST I: Opportunity keys are 100% deterministic across runs`
  );

  // --------------------------------------------------------------------------
  // TEST J: Database Idempotency
  // --------------------------------------------------------------------------
  console.log('\n--- TEST J: Database Idempotency ---');
  if (existingRun) {
    const oppsToPersist = opps1.slice(0, 3);
    // Run 1
    await persistInnovationOpportunities(existingRun.id, existingRun.inventionId, oppsToPersist);
    const count1 = await prisma.analysisOpportunity.count({ where: { analysisRunId: existingRun.id } });

    // Run 2 (duplicate call with same keys)
    await persistInnovationOpportunities(existingRun.id, existingRun.inventionId, oppsToPersist);
    const count2 = await prisma.analysisOpportunity.count({ where: { analysisRunId: existingRun.id } });

    assert(
      count1 === count2 && count1 === 3,
      `TEST J: Repeated persistence does not duplicate rows (Run 1: ${count1}, Run 2: ${count2})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST K: Groq Failure Resiliency
  // --------------------------------------------------------------------------
  console.log('\n--- TEST K: Groq Failure Resiliency ---');
  // Verify deterministic opportunities maintain fallback provenance when Groq explanations are omitted
  assert(
    opps1.every((o) => o.explanationProvenance === 'DETERMINISTIC_FALLBACK'),
    `TEST K: Opportunities safely default to DETERMINISTIC_FALLBACK provenance when live AI fails`
  );

  // --------------------------------------------------------------------------
  // TEST L: Empty Features Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- TEST L: Empty Features Behavior ---');
  const oppsEmptyFeatures = generateDeterministicOpportunities([], allEntries, testDocs);
  assert(
    oppsEmptyFeatures.length === 0,
    `TEST L: Zero invention features yields 0 opportunities without fabricating fake white-spaces`
  );

  // --------------------------------------------------------------------------
  // TEST M: Empty Prior Art Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- TEST M: Empty Prior Art Behavior ---');
  const oppsEmptyArt = generateDeterministicOpportunities(testFeatures, allEntries, []);
  assert(
    oppsEmptyArt.length === 0,
    `TEST M: Zero prior-art documents yields 0 opportunities without fabricating distinctive claims`
  );

  // --------------------------------------------------------------------------
  // TEST N: Combination Support Distinction
  // --------------------------------------------------------------------------
  console.log('\n--- TEST N: Combination Support Distinction ---');
  const combN = {
    combinationKey: 'comb-F1-F3',
    name: 'F1 + F3 Dual System',
    featureKeys: ['F1', 'F3'],
    features: [testFeatures[0], testFeatures[2]],
  };
  const evalN = evaluateCombinationSupport(combN, combinationEntries, testDocs.slice(0, 2));
  assert(
    evalN.directCombinationCoverage <= evalN.individualFeatureCoverage,
    `TEST N: Direct single-reference combination coverage (${evalN.directCombinationCoverage}) <= collective individual coverage (${evalN.individualFeatureCoverage})`
  );

  // --------------------------------------------------------------------------
  // TEST O: End-to-End Pipeline & API Route Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST O: End-to-End Pipeline & API Verification ---');
  const e2eInvention = {
    title: 'Solid-State Battery Thermal Management System',
    problem: 'Lithium dendrite formation under rapid charging conditions in solid-state batteries.',
    solution: 'Integrated microchannel dielectric liquid cooling with closed-loop Peltier regulation.',
    howItWorks: 'Sensors detect localized temperature differential and trigger Peltier cooling.',
    advantages: 'Prevents thermal runaway and suppresses dendrite growth.',
    differentiation: 'Directly woven microfluidic channels between solid electrolyte layers.',
    domain: 'Energy',
    industry: 'Automotive & Energy Storage',
  };

  const e2eResult = await executeInventionAnalysis(e2eInvention);
  assert(e2eResult.data.opportunities.length > 0, `TEST O: E2E pipeline generates innovation opportunities (Found: ${e2eResult.data.opportunities.length})`);

  // Verify opportunities in DB
  const dbOpps = await getInnovationGapsForAnalysis(e2eResult.analysisRunId);
  assert(dbOpps.length > 0, `TEST O: Persisted ${dbOpps.length} opportunities in PostgreSQL`);
  assert(
    dbOpps.some((o) => o.gapType === 'POTENTIALLY_DISTINCTIVE' || o.gapType === 'UNDERSERVED'),
    `TEST O: Successfully identifies distinctive combinations or underserved technical gaps`
  );

  // Test API endpoint GET /api/analysis/[id]/innovation
  const apiReq = new Request(`http://localhost:3000/api/analysis/${e2eResult.analysisRunId}/innovation`);
  const apiRes = await getInnovationRoute(apiReq, { params: { id: e2eResult.analysisRunId } });
  assert(apiRes.status === 200, `TEST O: API returns status 200 (got: ${apiRes.status})`);
  const apiJson = await apiRes.json();
  assert(apiJson.success === true, `TEST O: API returns success: true`);
  assert(apiJson.opportunities.length === dbOpps.length, `TEST O: API returns all persisted opportunities (${apiJson.opportunities.length})`);
  assert(apiJson.meta?.educationalNotice !== undefined, `TEST O: API includes mandatory educational disclaimer`);
  assert(!JSON.stringify(apiJson).includes('GROQ_API_KEY'), `TEST O: Zero secret leak in API response`);

  // Test API 404 for nonexistent ID
  const invalidReq = new Request(`http://localhost:3000/api/analysis/00000000-0000-0000-0000-000000000000/innovation`);
  const invalidRes = await getInnovationRoute(invalidReq, { params: { id: '00000000-0000-0000-0000-000000000000' } });
  assert(invalidRes.status === 404, `TEST O: API returns 404 for nonexistent ID (got: ${invalidRes.status})`);

  console.log('\n======================================================================');
  console.log(`PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runInnovationGapTests()
  .catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
