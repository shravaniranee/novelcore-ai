import { prisma } from '../lib/prisma';
import { DummyPatentProvider } from '../lib/patent/providers/dummy';
import { PatentsViewProvider } from '../lib/patent/providers/patentsview';
import { LensPatentProvider } from '../lib/patent/providers/lens';
import { getPatentProvider, searchAndIngestPriorArt } from '../lib/patent/service';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { setMockGroqHandler } from '../lib/ai/groq';

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 NOVELCORE AI ARCHITECTURE & INTEGRATION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [AUDIT PASS]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [AUDIT FAIL]: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. DEMO MODE SAFETY & HARDENING
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Auditing Demo Mode Safety & External API Isolation ---');
  
  const provider = getPatentProvider();
  assert(
    provider instanceof DummyPatentProvider,
    'getPatentProvider() strictly returns DummyPatentProvider when DEMO_MODE=true'
  );

  // Verify PatentsViewProvider is locked out
  let patentsViewBlocked = false;
  try {
    const pv = new PatentsViewProvider();
    await pv.search({ query: 'test query' });
  } catch (err: any) {
    patentsViewBlocked = err.message.includes('Safety Violation');
  }
  assert(
    patentsViewBlocked,
    'PatentsViewProvider throws Safety Violation when DEMO_MODE=true (cannot touch USPTO API)'
  );

  // Verify LensPatentProvider is locked out
  let lensBlocked = false;
  try {
    const lens = new LensPatentProvider();
    await lens.search({ query: 'test query' });
  } catch (err: any) {
    lensBlocked = err.message.includes('Safety Violation');
  }
  assert(
    lensBlocked,
    'LensPatentProvider throws Safety Violation when DEMO_MODE=true (cannot touch Lens API)'
  );

  // Verify searchAndIngestPriorArt cannot be hijacked by an external provider
  const hijackedResult = await searchAndIngestPriorArt({ query: 'DEMO-US-000001' }, new PatentsViewProvider() as any);
  assert(
    hijackedResult.length > 0 && hijackedResult[0].document.source === 'DEMO',
    'searchAndIngestPriorArt ignores external provider and forces DummyPatentProvider under DEMO_MODE'
  );

  // -------------------------------------------------------------------------
  // 2. DATABASE SCHEMA & SEED IDEMPOTENCY
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Auditing Database Schema & Seed Idempotency ---');

  const totalDemoDocs = await prisma.priorArtDocument.count({
    where: { source: 'DEMO' },
  });
  assert(
    totalDemoDocs === 32,
    `Database contains exactly 32 demo prior art documents (Found: ${totalDemoDocs})`
  );

  // Verify externalId is populated on all demo records
  const missingExternalId = await prisma.priorArtDocument.count({
    where: { source: 'DEMO', externalId: null },
  });
  assert(
    missingExternalId === 0,
    'All 32 PriorArtDocument records have stable, non-null externalId'
  );

  // Verify vectors are 1536-dim pgvector for demo patents
  const vectorDocs: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int as count FROM "prior_art_documents" WHERE "source" = 'DEMO' AND "embeddingDim" = 1536 AND "embedding" IS NOT NULL`
  );
  assert(
    vectorDocs[0].count === 32,
    `All 32 DEMO PriorArtDocument records have 1536-dimensional vector embeddings in pgvector (Found: ${vectorDocs[0].count})`
  );

  // -------------------------------------------------------------------------
  // 3. ANALYSIS PIPELINE CONSISTENCY & FOREIGN KEY INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Auditing Analysis Consistency & Foreign Key References ---');

  const sampleInvention = {
    title: 'Precision Micro-Aerosol Bio-Fungicide Drone Delivery Mechanism',
    problem: 'Excessive agricultural pesticide runoff causes environmental toxicity.',
    solution: 'An acoustic levitation mist atomizer on a multi-rotor drone for sub-micron droplet dispersal.',
    howItWorks: 'Ultrasonic piezoelectric transducers atomize bio-fungicide formulations into micro-droplets.',
    advantages: '90% reduction in chemical volume and eliminates wind drift contamination.',
    differentiation: 'Integrated resonance frequency tracking compensating for fluid temperature gradients.',
    domain: 'Agriculture Technology',
    industry: 'Agricultural Robotics',
  };

  setMockGroqHandler(async (options) => {
    if (options.prompt.includes('core technical concepts')) {
      return {
        coreTechnology: 'Acoustic Levitation Aerosol Atomization',
        technicalProblem: 'Excessive agricultural pesticide runoff causes environmental toxicity.',
        technicalSolution: 'Acoustic levitation mist atomizer on a multi-rotor drone for sub-micron droplet dispersal.',
        components: ['Piezoelectric Transducer Array', 'Multi-Rotor Flight Controller', 'Bio-Fungicide Reservoir'],
        mechanisms: ['Ultrasonic frequency resonance tracking', 'Temperature gradient phase compensation'],
        inputs: ['Fluid temperature telemetry', 'Airspeed sensor data'],
        outputs: ['Micro-aerosol droplets', 'Transducer power modulation signals'],
        importantFeatures: ['Resonance frequency tracking', 'Sub-micron droplet dispersal'],
      };
    }
    if (options.prompt.includes('numbered set of specific technical features')) {
      return {
        features: [
          { id: 'F1', name: 'Piezoelectric Transducer Assembly', description: 'Transducer array generating standing acoustic waves.', isNoveltyCandidate: false },
          { id: 'F2', name: 'Resonance Frequency Tracker', description: 'Real-time phase locked loop tracking transducer impedance.', isNoveltyCandidate: true },
          { id: 'F3', name: 'Sub-Micron Droplet Mist Disperser', description: 'Nozzleless atomization orifice array.', isNoveltyCandidate: true },
        ],
      };
    }
    if (options.prompt.includes('element-by-element comparison')) {
      return {
        comparisons: [
          { patentId: 'DEMO-US-000001', featureId: 'F1', status: 'DISCLOSED', evidenceField: 'abstract', evidenceQuote: 'autonomous aerial drone system equipped with multi-spectral NIR cameras...', explanation: 'Discloses aerial drone actuators.' },
          { patentId: 'DEMO-US-000001', featureId: 'F2', status: 'NOT_DISCLOSED', evidenceField: 'none', evidenceQuote: 'INSUFFICIENT_EVIDENCE', explanation: 'Does not disclose resonance frequency tracking.' },
          { patentId: 'DEMO-US-000001', featureId: 'F3', status: 'PARTIAL', evidenceField: 'abstract', evidenceQuote: 'droplet micro-nozzles', explanation: 'Discloses nozzles but not acoustic atomization.' },
        ],
      };
    }
    if (options.prompt.includes('novelty of the following invention') || options.prompt.includes('Analyze the novelty')) {
      return {
        overallNoveltyAssessment: 'The invention demonstrates novelty in ultrasonic resonance frequency tracking for acoustic droplet dispersal.',
        novelFeatures: ['F2: Resonance Frequency Tracker'],
        disclosedFeatures: ['F1: Piezoelectric Transducer Assembly'],
        differentiationRationale: 'Prior art references use standard pressure nozzles without resonance compensation.',
        noveltyRatio: 0.67,
      };
    }
    if (options.prompt.includes('actionable innovation opportunities')) {
      return {
        gaps: [
          { title: 'Closed-Loop Droplet Sizing Telemetry', impact: 'High', whyItMatters: 'Ensures optimal droplet diameter under changing humidity.', expectedImpact: '+15% absorption efficiency', recommendedAction: 'Add optical droplet sizing sensor.' },
        ],
      };
    }
    if (options.prompt.includes('Draft formal patent claims')) {
      return {
        independentClaims: [
          { claimNumber: 1, text: '1. An agricultural misting apparatus comprising an acoustic atomizer and a resonance tracker.', structuralElements: ['Acoustic atomizer', 'Resonance tracker'], noveltyFocus: 'Acoustic atomization with resonance tracking' },
        ],
        dependentClaims: [
          { claimNumber: 2, parentClaimNumber: 1, text: '2. The apparatus of claim 1, further comprising a flight controller.', limitation: 'Flight controller integration' },
        ],
      };
    }
    if (options.prompt.includes('Office Action examination')) {
      return {
        objections: [
          { category: 'NOVELTY_102', severity: 'High', title: '35 U.S.C. 102 Rejection over DEMO-US-000001', citedPatentIds: ['DEMO-US-000001'], concern: 'Reference discloses aerial spraying.', evidence: 'DEMO-US-000001 Abstract', recommendation: 'Amend to recite acoustic resonance tracking.' },
        ],
      };
    }
    return {};
  });

  const analysis1 = await executeInventionAnalysis(sampleInvention);
  const invId = analysis1.inventionId;
  const runId = analysis1.analysisRunId;

  // Verify PostgreSQL relational linking
  const dbRun = await prisma.analysisRun.findUnique({
    where: { id: runId },
    include: {
      priorArtMatches: true,
      opportunities: true,
      reports: true,
      invention: {
        include: {
          claims: true,
          examinerReviews: true,
        },
      },
    },
  });

  assert(
    dbRun !== null && dbRun.inventionId === invId,
    'AnalysisRun strictly references the same Invention ID'
  );

  assert(
    dbRun!.priorArtMatches.length > 0 &&
      dbRun!.priorArtMatches.every((m) => m.analysisRunId === runId),
    'All PriorArtMatch records strictly reference the same AnalysisRun ID'
  );

  assert(
    dbRun!.opportunities.length > 0 &&
      dbRun!.opportunities.every((o) => o.analysisRunId === runId && o.inventionId === invId),
    'All AnalysisOpportunity records strictly reference the same AnalysisRun and Invention ID'
  );

  assert(
    dbRun!.invention.claims.length > 0 &&
      dbRun!.invention.claims.every((c) => c.inventionId === invId),
    'All Claim records strictly reference the same Invention ID'
  );

  assert(
    dbRun!.invention.examinerReviews.length > 0 &&
      dbRun!.invention.examinerReviews.every((r) => r.inventionId === invId),
    'All ExaminerReview records strictly reference the same Invention ID'
  );

  // -------------------------------------------------------------------------
  // 4. DETERMINISM VERIFICATION (REPEATED RUNS)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Auditing Determinism on Repeated Runs ---');

  const analysis2 = await executeInventionAnalysis(sampleInvention);

  assert(
    analysis1.data.novelty === analysis2.data.novelty,
    `Novelty score is 100% deterministic (Run 1: ${analysis1.data.novelty} vs Run 2: ${analysis2.data.novelty})`
  );

  assert(
    analysis1.data.patentability === analysis2.data.patentability,
    `Patentability score is 100% deterministic (${analysis1.data.patentability} vs ${analysis2.data.patentability})`
  );

  assert(
    analysis1.data.priorArtRisk === analysis2.data.priorArtRisk,
    `Prior art risk is 100% deterministic (${analysis1.data.priorArtRisk} vs ${analysis2.data.priorArtRisk})`
  );

  const priorArt1Ids = analysis1.data.priorArt.map((p) => p.id).join(',');
  const priorArt2Ids = analysis2.data.priorArt.map((p) => p.id).join(',');
  assert(
    priorArt1Ids === priorArt2Ids,
    `Prior art ranking and document IDs are 100% identical (${priorArt1Ids})`
  );

  const opp1Titles = analysis1.data.opportunities.map((o) => o.title).join('|');
  const opp2Titles = analysis2.data.opportunities.map((o) => o.title).join('|');
  assert(
    opp1Titles === opp2Titles,
    'Innovation gap opportunities are 100% identical across repeated runs'
  );

  assert(
    analysis1.data.claims[0].optimized === analysis2.data.claims[0].optimized,
    'Optimized claims are 100% identical across repeated runs'
  );

  const exam1Concerns = analysis1.data.examinerObjections.map((e) => e.title).join('|');
  const exam2Concerns = analysis2.data.examinerObjections.map((e) => e.title).join('|');
  assert(
    exam1Concerns === exam2Concerns,
    'Examiner review objections and statutory grounds are 100% identical across repeated runs'
  );

  setMockGroqHandler(null);

  // -------------------------------------------------------------------------
  // 5. SEARCH & ZERO-MATCH RESILIENCE
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Auditing Search Resilience & Zero-Match Handling ---');

  const dummy = new DummyPatentProvider();

  // Search with non-existent query
  const emptyResults = await dummy.search({ query: 'nonexistent_gibberish_term_xyz_123' });
  assert(
    emptyResults.length === 0,
    'DummyPatentProvider returns empty array (0 matches) when search term does not exist'
  );

  // Search with empty query
  const defaultResults = await dummy.search({});
  assert(
    defaultResults.length === 10,
    'DummyPatentProvider returns default paginated records when search query is empty'
  );

  // Ingestion with zero matches
  const zeroIngest = await searchAndIngestPriorArt({ query: 'nonexistent_gibberish_term_xyz_123' });
  assert(
    zeroIngest.length === 0,
    'searchAndIngestPriorArt handles zero search matches gracefully without errors'
  );

  console.log('\n================================================================');
  console.log(`AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit()
  .catch((err) => {
    console.error('Audit failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
