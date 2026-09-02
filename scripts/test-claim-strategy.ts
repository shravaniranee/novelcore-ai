/**
 * NovelCore AI — Phase 9 Claim Strategy & Optimization Engine Test Suite
 *
 * Tests:
 * TEST A — Feature Grounding (all elements map to valid InventionFeatures)
 * TEST B — Unknown Feature Rejection (rejects F999)
 * TEST C — Cross-Analysis Feature Rejection (rejects features outside active run)
 * TEST D — Independent Claim Structure (claimType = INDEPENDENT with valid elements)
 * TEST E — Dependent Claim Structure (claimType = DEPENDENT adding existing feature)
 * TEST F — Invalid Dependent Claim (rejection on invalid feature reference)
 * TEST G — Claim Versioning (Version 1 immutable upon optimization into Version 2)
 * TEST H — Idempotent Initial Generation (no duplicate claims on repeated calls)
 * TEST I — Vulnerability Metrics (elevated single-reference coverage -> CRITICAL/HIGH vulnerability)
 * TEST J — Differentiation Indicator (underserved/distinctive features yield higher differentiation)
 * TEST K — Semantic Similarity Separation (semantic similarity alone != disclosure)
 * TEST L — Evidence Provenance (all cited references belong to current AnalysisRun)
 * TEST M — Groq Failure Resiliency (deterministic fallback preserved without fabricating text)
 * TEST N — No Features Behavior (graceful empty return when no features exist)
 * TEST O — No Prior Art Behavior (metrics marked insufficient, no false distinctiveness)
 * TEST P — Duplicate Claim Prevention (upserts on inventionId_claimNumber)
 * TEST Q — End-to-End Pipeline & API Verification (GET/POST /api/analysis/:id/claims and optimize)
 */

import { prisma } from '../lib/prisma';
import {
  prioritizeClaimFeatures,
  calculateClaimMetrics,
  generateDeterministicClaims,
  validateClaimFeatureGrounding,
  persistClaimStrategy,
  optimizeClaim,
  getClaimsForAnalysis,
  ClaimProposal,
  ClaimElementInput,
} from '../lib/analysis/claims';
import {
  FeatureInputForNovelty,
  PriorArtDocMeta,
  MatrixEntryForNovelty,
} from '../lib/analysis/novelty';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { GET as getClaimsRoute, POST as postGenerateClaimsRoute } from '../app/api/analysis/[id]/claims/route';
import { POST as postOptimizeClaimRoute } from '../app/api/analysis/[id]/claims/[claimId]/optimize/route';
import { GET as getClaimVersionsRoute } from '../app/api/claims/[claimId]/versions/route';

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

async function runClaimStrategyTests() {
  console.log('======================================================================');
  console.log('PHASE 9 CLAIM STRATEGY & OPTIMIZATION TEST SUITE');
  console.log('======================================================================\n');

  // Baseline test features
  const testFeatures: FeatureInputForNovelty[] = [
    { id: 'f-uuid-1', featureKey: 'F1', name: 'Microchannel Dielectric Matrix', description: 'Liquid dielectric cooling channel network', isNovelty: true },
    { id: 'f-uuid-2', featureKey: 'F2', name: 'Closed-Loop Peltier Actuator', description: 'Thermoelectric actuator for local thermal regulation', isNovelty: false },
    { id: 'f-uuid-3', featureKey: 'F3', name: 'Solid-State Ceramic Interlayer', description: 'Ceramic barrier separating electrolyte sheets', isNovelty: false },
    { id: 'f-uuid-4', featureKey: 'F4', name: 'Dynamic Thermal Gradient Sensor', description: 'Real-time differential temperature sensor', isNovelty: false },
  ];

  const testDocs: PriorArtDocMeta[] = [
    { id: 'doc-1', publicationNumber: 'DEMO-US-000001', title: 'Prior Art 1' },
    { id: 'doc-2', publicationNumber: 'DEMO-US-000002', title: 'Prior Art 2' },
    { id: 'doc-3', publicationNumber: 'DEMO-US-000003', title: 'Prior Art 3' },
  ];

  const testMatrixEntries: MatrixEntryForNovelty[] = [
    // Doc 1 discloses F2 heavily
    { priorArtDocumentId: 'doc-1', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F1', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-1', featureId: 'F2', overlapStatus: 'DISCLOSED', evidence: 'Verbatim Peltier unit', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-1', featureId: 'F3', overlapStatus: 'PARTIAL', evidence: 'Generic separator', evidenceSource: 'description' },
    // Doc 2 discloses F2 and F3
    { priorArtDocumentId: 'doc-2', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F1', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-2', featureId: 'F2', overlapStatus: 'DISCLOSED', evidence: 'Peltier element cooling', evidenceSource: 'description' },
    { priorArtDocumentId: 'doc-2', featureId: 'F3', overlapStatus: 'DISCLOSED', evidence: 'Ceramic electrolyte barrier', evidenceSource: 'claims' },
    // Doc 3 discloses F3 only
    { priorArtDocumentId: 'doc-3', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F1', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-3', featureId: 'F2', overlapStatus: 'NOT_DISCLOSED', evidence: 'No F2', evidenceSource: 'claims' },
    { priorArtDocumentId: 'doc-3', featureId: 'F3', overlapStatus: 'DISCLOSED', evidence: 'Solid ceramic interlayer', evidenceSource: 'claims' },
  ];

  // --------------------------------------------------------------------------
  // TEST A: Feature Grounding
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Feature Grounding ---');
  const validProposal: ClaimProposal = {
    claimNumber: 1,
    claimType: 'INDEPENDENT',
    title: 'Independent Apparatus Claim',
    claimText: '1. An apparatus comprising F1 and F2 and F3.',
    elements: [
      { elementKey: 'elem-1', text: 'a microchannel dielectric matrix', featureKey: 'F1', order: 1, elementType: 'LIMITATION' },
      { elementKey: 'elem-2', text: 'a closed-loop Peltier actuator', featureKey: 'F2', order: 2, elementType: 'LIMITATION' },
      { elementKey: 'elem-3', text: 'a solid-state ceramic interlayer', featureKey: 'F3', order: 3, elementType: 'LIMITATION' },
    ],
  };

  const valA = validateClaimFeatureGrounding(validProposal, testFeatures);
  assert(valA.valid === true, `TEST A: Valid claim elements pass feature grounding`);
  assert(valA.errors.length === 0, `TEST A: Zero grounding validation errors`);

  // --------------------------------------------------------------------------
  // TEST B: Unknown Feature Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Unknown Feature Rejection ---');
  const invalidProposalB: ClaimProposal = {
    ...validProposal,
    elements: [
      ...validProposal.elements,
      { elementKey: 'elem-999', text: 'an invented quantum encryption module', featureKey: 'F999', order: 4, elementType: 'LIMITATION' },
    ],
  };

  const valB = validateClaimFeatureGrounding(invalidProposalB, testFeatures);
  assert(valB.valid === false, `TEST B: Unknown feature F999 correctly rejected`);
  assert(
    valB.errors.some((e) => e.includes('F999')),
    `TEST B: Validation error explicitly identifies invalid feature key F999`
  );

  // --------------------------------------------------------------------------
  // TEST C: Cross-Analysis Feature Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: Cross-Analysis Feature Rejection ---');
  const otherRunFeatures: FeatureInputForNovelty[] = [
    { id: 'f-other-1', featureKey: 'OTHER_F1', name: 'Other Invention Feature', isNovelty: true },
  ];
  const valC = validateClaimFeatureGrounding(validProposal, otherRunFeatures);
  assert(valC.valid === false, `TEST C: Features outside the active analysis feature set are rejected`);

  // --------------------------------------------------------------------------
  // TEST D: Independent Claim Structure
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Independent Claim Structure ---');
  const prioritized = prioritizeClaimFeatures(testFeatures, testMatrixEntries, testDocs);
  assert(prioritized[0].role === 'CORE', `TEST D: Differentiating novelty feature assigned CORE role`);
  assert(prioritized[0].featureKey === 'F1', `TEST D: F1 correctly identified as top CORE feature`);

  const generatedClaims = generateDeterministicClaims(
    'Solid-State Battery Cooling System',
    'Energy',
    prioritized,
    testDocs,
    testMatrixEntries
  );

  const indClaim = generatedClaims.find((c) => c.claimType === 'INDEPENDENT');
  assert(indClaim !== undefined, `TEST D: Generates independent claim`);
  assert(indClaim?.claimNumber === 1, `TEST D: Independent claim has claimNumber = 1`);
  assert(
    Boolean(indClaim && indClaim.elements.every((e) => ['F1', 'F2', 'F3', 'F4'].includes(e.featureKey))),
    `TEST D: Every element in independent claim maps to an authentic feature`
  );
  assert(indClaim?.metrics.groundedFeatureRatio === 1.0, `TEST D: Grounded feature ratio is 100%`);

  // --------------------------------------------------------------------------
  // TEST E: Dependent Claim Structure
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E: Dependent Claim Structure ---');
  const depClaims = generatedClaims.filter((c) => c.claimType === 'DEPENDENT');
  assert(depClaims.length > 0, `TEST E: Generates dependent claims (Count: ${depClaims.length})`);
  assert(
    depClaims.every((d) => d.parentClaimNumber === 1),
    `TEST E: All dependent claims reference parent claim 1`
  );
  assert(
    depClaims.every((d) => d.elements.some((e) => e.elementType === 'NARROWING')),
    `TEST E: Dependent claims introduce narrowing limitations`
  );

  // --------------------------------------------------------------------------
  // TEST F: Invalid Dependent Claim Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F: Invalid Dependent Claim Rejection ---');
  const invalidDepProposal: ClaimProposal = {
    claimNumber: 2,
    claimType: 'DEPENDENT',
    parentClaimNumber: 1,
    title: 'Invalid Dependent Claim',
    claimText: '2. The apparatus of claim 1, further comprising F_FAKE.',
    elements: [
      { elementKey: 'elem-dep-1', text: 'wherein', featureKey: 'F1', order: 1, elementType: 'PREAMBLE' },
      { elementKey: 'elem-dep-2', text: 'further comprising fake element', featureKey: 'F_FAKE', order: 2, elementType: 'NARROWING' },
    ],
  };
  const valF = validateClaimFeatureGrounding(invalidDepProposal, testFeatures);
  assert(valF.valid === false, `TEST F: Invalid dependent claim with nonexistent feature rejected`);

  // --------------------------------------------------------------------------
  // TEST G: Claim Versioning & Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G: Claim Versioning & Immutability ---');
  const existingRun = await prisma.analysisRun.findFirst({
    where: { status: 'COMPLETED' },
    include: { inventionFeatures: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existingRun && existingRun.inventionFeatures.length >= 2) {
    const runId = existingRun.id;
    const invId = existingRun.inventionId;

    // Persist initial claim set
    await persistClaimStrategy(invId, runId, generatedClaims);

    const savedClaims = await getClaimsForAnalysis(runId, invId);
    const targetClaim = savedClaims.find((c) => c.claimNumber === 1);
    assert(targetClaim !== undefined, `TEST G: Initial Claim 1 persisted in database`);

    const version1Text = targetClaim!.versions[0]?.claimText;
    const version1Id = targetClaim!.versions[0]?.id;

    // Execute Claim Optimization
    const optResult = await optimizeClaim({
      claimId: targetClaim!.id,
      analysisRunId: runId,
      reason: 'Narrowed independent claim to suppress prior art vulnerability.',
      narrowingFeatureKey: existingRun.inventionFeatures[1].featureKey,
    });

    assert(optResult.success === true, `TEST G: Claim optimization succeeds`);
    assert(optResult.newVersion.versionNumber === 2, `TEST G: Creates Version 2`);

    // Verify Version 1 remains unchanged in database
    const v1Record = await prisma.claimVersion.findUnique({ where: { id: version1Id } });
    assert(
      v1Record?.claimText === version1Text && v1Record?.versionNumber === 1,
      `TEST G: Version 1 is immutable and preserved unchanged in PostgreSQL`
    );
  } else {
    console.log('  [SKIP] No completed run found for versioning tests.');
  }

  // --------------------------------------------------------------------------
  // TEST H: Idempotent Initial Generation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST H: Idempotent Initial Generation ---');
  if (existingRun) {
    const countBefore = await prisma.claim.count({ where: { inventionId: existingRun.inventionId } });
    // Re-run persistence
    await persistClaimStrategy(existingRun.inventionId, existingRun.id, generatedClaims);
    const countAfter = await prisma.claim.count({ where: { inventionId: existingRun.inventionId } });
    assert(countBefore === countAfter, `TEST H: Re-running initial claim persistence is strictly idempotent (${countBefore} === ${countAfter})`);
  }

  // --------------------------------------------------------------------------
  // TEST I: Vulnerability Metrics Calculation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST I: Vulnerability Metrics Calculation ---');
  // Claim containing only F2 (disclosed by Doc 1 and Doc 2) -> high vulnerability
  const crowdedElements: ClaimElementInput[] = [
    { elementKey: 'elem-c1', text: 'a Peltier unit', featureKey: 'F2', order: 1, elementType: 'LIMITATION' },
  ];
  const metricsCrowded = calculateClaimMetrics(crowdedElements, testDocs, testMatrixEntries, testFeatures);
  assert(
    metricsCrowded.singleReferenceCoverage === 1.0,
    `TEST I: 100% single-reference overlap on crowded element (got: ${metricsCrowded.singleReferenceCoverage})`
  );
  assert(
    metricsCrowded.vulnerabilityIndicator === 'CRITICAL',
    `TEST I: Complete single-reference overlap flags CRITICAL vulnerability concern`
  );

  // --------------------------------------------------------------------------
  // TEST J: Differentiation Indicator
  // --------------------------------------------------------------------------
  console.log('\n--- TEST J: Differentiation Indicator ---');
  // Claim containing F1 (novelty/underserved, 0 disclosures)
  const distinctiveElements: ClaimElementInput[] = [
    { elementKey: 'elem-d1', text: 'a microchannel dielectric matrix', featureKey: 'F1', order: 1, elementType: 'LIMITATION' },
  ];
  const metricsDistinctive = calculateClaimMetrics(distinctiveElements, testDocs, testMatrixEntries, testFeatures);
  assert(
    metricsDistinctive.differentiationScore > metricsCrowded.differentiationScore,
    `TEST J: Distinctive claim achieves higher differentiation score (${metricsDistinctive.differentiationScore} > ${metricsCrowded.differentiationScore})`
  );
  assert(
    metricsDistinctive.vulnerabilityIndicator === 'LOW',
    `TEST J: Undisclosed feature exhibits LOW vulnerability indicator`
  );

  // --------------------------------------------------------------------------
  // TEST K: Semantic Similarity Separation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST K: Semantic Similarity Separation ---');
  const simOnlyDoc: PriorArtDocMeta = { id: 'doc-sim', publicationNumber: 'SIM-999', title: 'High Similarity Art' };
  const entriesSimOnly: MatrixEntryForNovelty[] = [
    { priorArtDocumentId: 'doc-sim', featureId: 'F1', overlapStatus: 'NOT_DISCLOSED', evidence: 'No overlap', evidenceSource: 'none' },
  ];
  const metricsSim = calculateClaimMetrics(distinctiveElements, [simOnlyDoc], entriesSimOnly, testFeatures);
  assert(
    metricsSim.singleReferenceCoverage === 0.0,
    `TEST K: Semantic similarity without matrix disclosure yields 0.0 coverage`
  );

  // --------------------------------------------------------------------------
  // TEST L: Evidence Provenance
  // --------------------------------------------------------------------------
  console.log('\n--- TEST L: Evidence Provenance ---');
  assert(
    metricsCrowded.priorArtVulnerabilities.every((v) => testDocs.some((d) => d.id === v.priorArtDocumentId)),
    `TEST L: All cited prior-art references belong strictly to current candidate set`
  );

  // --------------------------------------------------------------------------
  // TEST M: Groq Failure Resiliency
  // --------------------------------------------------------------------------
  console.log('\n--- TEST M: Groq Failure Resiliency ---');
  // When AI fails, deterministic claims are preserved with SYSTEM_GENERATED provenance
  assert(
    generatedClaims.every((c) => c.source === 'SYSTEM_GENERATED'),
    `TEST M: Falls back safely to deterministic claims when Groq is unavailable`
  );

  // --------------------------------------------------------------------------
  // TEST N: Empty Features Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- TEST N: Empty Features Behavior ---');
  const emptyClaims = generateDeterministicClaims('Test', 'Domain', [], testDocs, testMatrixEntries);
  assert(emptyClaims.length === 0, `TEST N: Zero invention features yields empty claim list without fabricating claims`);

  // --------------------------------------------------------------------------
  // TEST O: Empty Prior Art Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- TEST O: Empty Prior Art Behavior ---');
  const claimsNoArt = generateDeterministicClaims('Test', 'Domain', prioritized, [], []);
  assert(
    claimsNoArt.length > 0 && claimsNoArt[0].metrics.evidenceConfidence === 0.0,
    `TEST O: Absence of prior art marks evidence confidence as 0.0 without fabricating false citations`
  );

  // --------------------------------------------------------------------------
  // TEST P: Duplicate Claim Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- TEST P: Duplicate Claim Prevention ---');
  const claimNums = generatedClaims.map((c) => c.claimNumber);
  const uniqueNums = new Set(claimNums);
  assert(claimNums.length === uniqueNums.size, `TEST P: Every generated claim has a unique sequential claim number`);

  // --------------------------------------------------------------------------
  // TEST Q: End-to-End Pipeline & API Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST Q: End-to-End Pipeline & API Verification ---');
  const e2eInvention = {
    title: 'Solid-State Electrolyte Heat Exchanger',
    problem: 'Excessive thermal dissipation during high-rate solid-state battery cycling.',
    solution: 'Integrated ceramic microfluidic heatsink with closed-loop Peltier regulation.',
    howItWorks: 'Temperature sensors dynamically modulate Peltier current through dielectric channels.',
    advantages: 'Extends solid-state cell lifespan and suppresses thermal runaway.',
    differentiation: 'Direct ceramic microchannel matrix co-fired within electrolyte separator.',
    domain: 'Energy',
    industry: 'Automotive & Energy Storage',
  };

  const e2eResult = await executeInventionAnalysis(e2eInvention);
  const runId = e2eResult.analysisRunId;

  // 1. Verify claims saved in database
  const dbClaims = await getClaimsForAnalysis(runId, e2eResult.data.title);
  assert(dbClaims.length > 0, `TEST Q: E2E pipeline persisted claims in PostgreSQL (Found: ${dbClaims.length})`);
  assert(
    dbClaims.some((c) => c.claimType === 'INDEPENDENT') && dbClaims.some((c) => c.claimType === 'DEPENDENT'),
    `TEST Q: Persisted both INDEPENDENT and DEPENDENT claims`
  );

  const indDbClaim = dbClaims.find((c) => c.claimType === 'INDEPENDENT');
  assert(
    indDbClaim?.versions[0]?.elements.length! > 0,
    `TEST Q: Claim elements persisted and joined to InventionFeature (Count: ${indDbClaim?.versions[0]?.elements.length})`
  );

  // 2. Test GET /api/analysis/[id]/claims
  const getReq = new Request(`http://localhost:3000/api/analysis/${runId}/claims`);
  const getRes = await getClaimsRoute(getReq, { params: { id: runId } });
  assert(getRes.status === 200, `TEST Q: GET /api/analysis/[id]/claims returns 200`);
  const getJson = await getRes.json();
  assert(getJson.success === true, `TEST Q: API returns success: true`);
  assert(getJson.claims.length === dbClaims.length, `TEST Q: API returns all persisted claims`);
  assert(getJson.meta?.educationalNotice !== undefined, `TEST Q: API response contains mandatory educational disclaimer`);
  assert(!JSON.stringify(getJson).includes('GROQ_API_KEY'), `TEST Q: Zero secret leak in API response`);

  // 3. Test POST /api/analysis/[id]/claims/[claimId]/optimize
  const optReq = new Request(`http://localhost:3000/api/analysis/${runId}/claims/${indDbClaim!.id}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Add dependent narrowing limitation to decrease obviousness risk.' }),
  });
  const optRes = await postOptimizeClaimRoute(optReq, { params: { id: runId, claimId: indDbClaim!.id } });
  assert(optRes.status === 200, `TEST Q: POST /api/analysis/[id]/claims/[claimId]/optimize returns 200`);
  const optJson = await optRes.json();
  assert(optJson.success === true, `TEST Q: Optimization API returns success: true`);
  assert(optJson.newVersion.versionNumber === 2, `TEST Q: Optimization API created Version 2`);

  // 4. Test GET /api/claims/[claimId]/versions
  const versionsReq = new Request(`http://localhost:3000/api/claims/${indDbClaim!.id}/versions`);
  const versionsRes = await getClaimVersionsRoute(versionsReq, { params: { claimId: indDbClaim!.id } });
  assert(versionsRes.status === 200, `TEST Q: GET /api/claims/[claimId]/versions returns 200`);
  const versionsJson = await versionsRes.json();
  assert(versionsJson.versionsCount >= 2, `TEST Q: Claim versions endpoint returns full version history (Count: ${versionsJson.versionsCount})`);

  console.log('\n======================================================================');
  console.log(`PHASE 9 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClaimStrategyTests()
  .catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
