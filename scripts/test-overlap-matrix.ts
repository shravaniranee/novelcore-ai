import { prisma } from '../lib/prisma';
import {
  validateMatrixEntries,
  calculateFeatureCoveragePerPatent,
  calculatePatentCoveragePerFeature,
  calculateMatrixSummaryStats,
  sortFeaturesDeterministically,
  sortPatentsDeterministically,
  persistFeatureOverlapMatrix,
  getFeatureOverlapMatrixForAnalysis,
  MatrixEntryInput,
  PatentMetadata,
  FeatureDefinition,
} from '../lib/analysis/matrix';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { setMockGroqHandler } from '../lib/ai/groq';

async function runOverlapMatrixTests() {
  console.log('================================================================');
  console.log('📊 TESTING PHASE 6: FEATURE OVERLAP MATRIX & COVERAGE ENGINE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. UNIT TEST: VALIDATION OF PATENT IDS & FEATURE IDS
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing Strict Matrix Validation ---');

  const validPatents = ['doc-uuid-1', 'doc-uuid-2'];
  const validFeatures = ['F1', 'F2', 'F3'];

  const validEntries: MatrixEntryInput[] = [
    {
      inventionId: 'inv-1',
      analysisRunId: 'run-1',
      priorArtDocumentId: 'doc-uuid-1',
      featureId: 'F1',
      overlapStatus: 'DISCLOSED',
      evidence: 'Disclosed in claim 1',
      evidenceSource: 'claims',
    },
    {
      inventionId: 'inv-1',
      analysisRunId: 'run-1',
      priorArtDocumentId: 'doc-uuid-2',
      featureId: 'F2',
      overlapStatus: 'NOT_DISCLOSED',
      evidence: 'INSUFFICIENT_EVIDENCE',
      evidenceSource: 'none',
    },
  ];

  const validResult = validateMatrixEntries(validEntries, validPatents, validFeatures);
  assert(validResult.valid && validResult.errors.length === 0, 'Valid entries pass validation with 0 errors');

  // Test invalid priorArtDocumentId
  const invalidPatentEntries: MatrixEntryInput[] = [
    {
      inventionId: 'inv-1',
      analysisRunId: 'run-1',
      priorArtDocumentId: 'NONEXISTENT_PATENT_UUID_999',
      featureId: 'F1',
      overlapStatus: 'DISCLOSED',
      evidence: 'Evidence',
      evidenceSource: 'abstract',
    },
  ];

  const invalidPatentResult = validateMatrixEntries(invalidPatentEntries, validPatents, validFeatures);
  assert(!invalidPatentResult.valid, 'validateMatrixEntries rejects nonexistent priorArtDocumentId');
  assert(
    invalidPatentResult.errors[0]?.includes('NONEXISTENT_PATENT_UUID_999'),
    `Validation error identifies invalid patent ID (${invalidPatentResult.errors[0]})`
  );

  // Test invalid featureId
  const invalidFeatureEntries: MatrixEntryInput[] = [
    {
      inventionId: 'inv-1',
      analysisRunId: 'run-1',
      priorArtDocumentId: 'doc-uuid-1',
      featureId: 'F999',
      overlapStatus: 'PARTIAL',
      evidence: 'Evidence',
      evidenceSource: 'description',
    },
  ];

  const invalidFeatureResult = validateMatrixEntries(invalidFeatureEntries, validPatents, validFeatures);
  assert(!invalidFeatureResult.valid, 'validateMatrixEntries rejects nonexistent featureId');
  assert(
    invalidFeatureResult.errors[0]?.includes('F999'),
    `Validation error identifies invalid feature ID (${invalidFeatureResult.errors[0]})`
  );

  // ---------------------------------------------------------------------------
  // 2. UNIT TEST: COVERAGE & DISTRIBUTION CALCULATIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Coverage & Scoring Support Calculations ---');

  const testPatents: PatentMetadata[] = [
    { id: 'pat-1', publicationNumber: 'DEMO-US-000001', title: 'Patent Alpha', ranking: 1 },
    { id: 'pat-2', publicationNumber: 'DEMO-US-000002', title: 'Patent Beta', ranking: 2 },
  ];

  const testFeatures: FeatureDefinition[] = [
    { id: 'F1', name: 'Sensor Array' },
    { id: 'F2', name: 'Neural Kernel' },
    { id: 'F3', name: 'Closed-Loop Actuator' },
  ];

  const sampleMatrix: MatrixEntryInput[] = [
    // Patent 1: Discloses F1, Partially discloses F2, Not F3
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-1', featureId: 'F1', overlapStatus: 'DISCLOSED', evidence: 'E1' },
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-1', featureId: 'F2', overlapStatus: 'PARTIAL', evidence: 'E2' },
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-1', featureId: 'F3', overlapStatus: 'NOT_DISCLOSED', evidence: 'INSUFFICIENT_EVIDENCE' },
    // Patent 2: Discloses F1, Not F2, Not F3
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-2', featureId: 'F1', overlapStatus: 'DISCLOSED', evidence: 'E3' },
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-2', featureId: 'F2', overlapStatus: 'NOT_DISCLOSED', evidence: 'INSUFFICIENT_EVIDENCE' },
    { inventionId: 'inv-1', analysisRunId: 'run-1', priorArtDocumentId: 'pat-2', featureId: 'F3', overlapStatus: 'NOT_DISCLOSED', evidence: 'INSUFFICIENT_EVIDENCE' },
  ];

  // Feature coverage per patent
  const featCoverage = calculateFeatureCoveragePerPatent(sampleMatrix, testPatents, testFeatures.length);
  assert(featCoverage.length === 2, 'Calculates feature coverage for all patents in matrix');
  // Pat-1: 1 Disclosed + 0.5 Partial = 1.5 / 3 = 50.0%
  assert(featCoverage[0].coveragePercentage === 50, `Patent 1 coverage percentage is 50% (Found: ${featCoverage[0].coveragePercentage}%)`);
  assert(featCoverage[0].totalDisclosed === 1 && featCoverage[0].totalPartial === 1, 'Patent 1 count counts correctly');
  // Pat-2: 1 Disclosed = 1 / 3 = 33.3%
  assert(featCoverage[1].coveragePercentage === 33.3, `Patent 2 coverage percentage is 33.3% (Found: ${featCoverage[1].coveragePercentage}%)`);

  // Patent coverage per feature
  const patCoverage = calculatePatentCoveragePerFeature(sampleMatrix, testFeatures, testPatents);
  assert(patCoverage.length === 3, 'Calculates patent coverage for all 3 features');
  // F1 disclosed by both patents
  assert(patCoverage[0].isDisclosedAnywhere === true, 'F1 is correctly marked as disclosed anywhere');
  assert(patCoverage[0].disclosedByPatents.length === 2, 'F1 disclosed by both DEMO-US-000001 and DEMO-US-000002');
  // F2 partially disclosed by pat-1, not pat-2
  assert(patCoverage[1].isPartiallyDisclosedAnywhere === true, 'F2 is marked as partially disclosed');
  // F3 not disclosed anywhere -> UNIQUE
  assert(patCoverage[2].isUnique === true, 'F3 is correctly identified as a UNIQUE undiscovered feature');

  // Matrix summary stats
  const summary = calculateMatrixSummaryStats(patCoverage, featCoverage);
  assert(summary.totalDisclosedFeatures === 1, `Total disclosed features = 1 (Found: ${summary.totalDisclosedFeatures})`);
  assert(summary.totalPartialFeatures === 1, `Total partial features = 1 (Found: ${summary.totalPartialFeatures})`);
  assert(summary.totalUniqueFeatures === 1, `Total unique features = 1 (Found: ${summary.totalUniqueFeatures})`);
  assert(summary.totalEvaluatedFeatures === 3, `Total evaluated features = 3 (Found: ${summary.totalEvaluatedFeatures})`);

  // ---------------------------------------------------------------------------
  // 3. UNIT TEST: DETERMINISTIC ORDERING
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Deterministic Ordering Helpers ---');

  const scrambledFeatures = [{ id: 'F10' }, { id: 'F2' }, { id: 'F1' }, { id: 'F3' }];
  const sortedFeats = sortFeaturesDeterministically(scrambledFeatures);
  const featOrder = sortedFeats.map((f) => f.id).join(',');
  assert(featOrder === 'F1,F2,F3,F10', `Features sorted naturally by numeric index (Found: ${featOrder})`);

  const scrambledPatents = [
    { id: 'b', ranking: 3, publicationNumber: 'DEMO-US-000003' },
    { id: 'a', ranking: 1, publicationNumber: 'DEMO-US-000001' },
    { id: 'c', ranking: 2, publicationNumber: 'DEMO-US-000002' },
  ];
  const sortedPats = sortPatentsDeterministically(scrambledPatents);
  const patOrder = sortedPats.map((p) => p.ranking).join(',');
  assert(patOrder === '1,2,3', `Patents sorted deterministically by ranking (Found: ${patOrder})`);

  // ---------------------------------------------------------------------------
  // 4. INTEGRATION TEST: MATRIX CREATION & DATABASE PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing End-to-End Persistence & Duplicate Prevention in PostgreSQL ---');

  // Set mock handler to run deterministic analysis
  setMockGroqHandler(async (options) => {
    if (options.prompt.includes('core technical concepts')) {
      return {
        coreTechnology: 'Electrochemical Flow Cell',
        technicalProblem: 'Electrolyte degradation under high current density.',
        technicalSolution: 'Bipolar membrane separator with pulsed electro-osmotic flushing.',
        components: ['Bipolar Membrane', 'Flow Chamber', 'Pulse Waveform Generator'],
        mechanisms: ['Electro-osmotic flow', 'Periodic polarity inversion'],
        inputs: ['Cell voltage', 'Electrolyte pH'],
        outputs: ['Regenerated electrolyte', 'Porous flow telemetry'],
        importantFeatures: ['Pulsed electro-osmotic flushing', 'Bipolar membrane separator'],
      };
    }
    if (options.prompt.includes('numbered set of specific technical features')) {
      return {
        features: [
          { id: 'F1', name: 'Bipolar Membrane Separator', description: 'Dual-layer ion exchange membrane.', isNoveltyCandidate: false },
          { id: 'F2', name: 'Pulsed Electro-Osmotic Flushing System', description: 'Dynamic periodic pulse generator.', isNoveltyCandidate: true },
          { id: 'F3', name: 'Real-Time Cell Impedance Monitor', description: 'High-frequency AC perturbation probe.', isNoveltyCandidate: true },
        ],
      };
    }
    if (options.prompt.includes('element-by-element comparison')) {
      return {
        comparisons: [
          { patentId: 'DEMO-US-000016', featureId: 'F1', status: 'DISCLOSED', evidenceField: 'claims', evidenceQuote: 'solid-state electrolyte separator matrix...', explanation: 'Discloses membrane separator.' },
          { patentId: 'DEMO-US-000016', featureId: 'F2', status: 'NOT_DISCLOSED', evidenceField: 'none', evidenceQuote: 'INSUFFICIENT_EVIDENCE', explanation: 'Does not disclose pulsed flushing.' },
          { patentId: 'DEMO-US-000016', featureId: 'F3', status: 'PARTIAL', evidenceField: 'abstract', evidenceQuote: 'impedance sensor electrodes', explanation: 'Discloses electrodes without AC perturbation.' },
        ],
      };
    }
    if (options.prompt.includes('novelty of the following invention') || options.prompt.includes('Analyze the novelty')) {
      return {
        overallNoveltyAssessment: 'The invention demonstrates novelty in pulsed electro-osmotic membrane flushing.',
        novelFeatures: ['F2: Pulsed Electro-Osmotic Flushing System'],
        disclosedFeatures: ['F1: Bipolar Membrane Separator'],
        differentiationRationale: 'Prior art documents do not recite pulsed electro-osmotic flushing.',
        noveltyRatio: 0.67,
      };
    }
    return {};
  });

  const testInvention = {
    title: 'Pulsed Electro-Osmotic Membrane Flow Cell',
    problem: 'Membrane fouling reduces battery efficiency and operating life.',
    solution: 'Pulsed electro-osmotic fluid actuation preventing ion accumulation at the boundary layer.',
    howItWorks: 'Sub-millisecond voltage pulses induce directional fluid micro-eddies.',
    advantages: 'Triples cycle life and reduces membrane cleaning downtime.',
    differentiation: 'Adaptive waveform switching synchronized with boundary layer capacitance.',
    domain: 'Clean Energy & Battery Storage',
    industry: 'Energy Storage Systems',
  };

  const analysisResult = await executeInventionAnalysis(testInvention);
  const runId = analysisResult.analysisRunId;

  // Verify matrix entries were created in PostgreSQL
  const dbEntries = await prisma.featureOverlapMatrixEntry.findMany({
    where: { analysisRunId: runId },
  });

  assert(dbEntries.length > 0, `Feature overlap matrix records created in PostgreSQL (Found: ${dbEntries.length})`);

  const firstEntry = dbEntries[0];
  assert(
    Boolean(firstEntry.inventionId && firstEntry.analysisRunId && firstEntry.priorArtDocumentId && firstEntry.featureId),
    'Matrix entry contains all required foreign key and identifier references'
  );
  assert(
    ['DISCLOSED', 'PARTIAL', 'NOT_DISCLOSED', 'INSUFFICIENT_EVIDENCE'].includes(firstEntry.overlapStatus),
    `Matrix entry overlapStatus is a valid OverlapStatus enum (${firstEntry.overlapStatus})`
  );
  assert(Boolean(firstEntry.evidence), `Matrix entry contains non-null evidence (${firstEntry.evidence.substring(0, 30)}...)`);

  // ---------------------------------------------------------------------------
  // 5. TEST: DUPLICATE PREVENTION (UPSERT IDEMPOTENCY)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Duplicate Prevention ---');

  const initialCount = await prisma.featureOverlapMatrixEntry.count({
    where: { analysisRunId: runId },
  });

  // Re-persist exact same entries
  const reEntries: MatrixEntryInput[] = dbEntries.map((e) => ({
    inventionId: e.inventionId,
    analysisRunId: e.analysisRunId,
    priorArtDocumentId: e.priorArtDocumentId,
    featureId: e.featureId,
    overlapStatus: e.overlapStatus as any,
    evidence: e.evidence,
    evidenceSource: e.evidenceSource,
    featureName: e.featureName,
    featureDescription: e.featureDescription,
    explanation: e.explanation,
  }));

  await persistFeatureOverlapMatrix(reEntries);

  const postCount = await prisma.featureOverlapMatrixEntry.count({
    where: { analysisRunId: runId },
  });

  assert(
    initialCount === postCount,
    `Duplicate prevention succeeds: re-persisting exact entries did not create duplicate rows (${initialCount} === ${postCount})`
  );

  // ---------------------------------------------------------------------------
  // 6. TEST: STRUCTURED MATRIX VIEW & METRICS RETRIEVAL
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Structured Matrix Retrieval & View Assembly ---');

  const matrixView = await getFeatureOverlapMatrixForAnalysis(runId);
  assert(matrixView !== null, 'getFeatureOverlapMatrixForAnalysis returns structured matrix view');
  assert(matrixView!.dimensions.rows > 0, `Matrix view has prior art rows (Rows: ${matrixView?.dimensions.rows})`);
  assert(matrixView!.dimensions.columns > 0, `Matrix view has feature columns (Columns: ${matrixView?.dimensions.columns})`);
  assert(
    matrixView!.dimensions.totalCells === matrixView!.matrix.length,
    `Matrix view dimensions accurately reflect cell count (${matrixView?.dimensions.totalCells} === ${matrixView?.matrix.length})`
  );
  assert(
    matrixView!.stats.featureCoveragePerPatent.length === matrixView!.dimensions.rows,
    'Coverage stats computed for every patent row'
  );
  assert(
    matrixView!.stats.patentCoveragePerFeature.length === matrixView!.dimensions.columns,
    'Coverage stats computed for every feature column'
  );

  // ---------------------------------------------------------------------------
  // 7. TEST: API ENDPOINT (GET /api/analysis/[id]/matrix)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing Matrix API Endpoint ---');

  const { GET } = await import('../app/api/analysis/[id]/matrix/route');
  const mockReq = new Request(`http://localhost:3000/api/analysis/${runId}/matrix`);
  const apiRes = await GET(mockReq, { params: { id: runId } });
  const apiJson = await apiRes.json();

  assert(apiRes.status === 200, `Matrix API returns status 200 (Status: ${apiRes.status})`);
  assert(apiJson.success === true, 'Matrix API returns success: true');
  assert(apiJson.analysisRunId === runId, `Matrix API returns correct analysisRunId (${apiJson.analysisRunId})`);
  assert(apiJson.dimensions?.rows > 0, `Matrix API returns dimensions.rows (${apiJson.dimensions?.rows})`);
  assert(apiJson.matrix?.length > 0, `Matrix API returns structured matrix array (Cells: ${apiJson.matrix?.length})`);
  assert(Boolean(apiJson.stats?.summary), 'Matrix API returns stats summary object');

  // Clean up mock handler
  setMockGroqHandler(null);

  console.log('\n================================================================');
  console.log(`FEATURE OVERLAP MATRIX TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOverlapMatrixTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
