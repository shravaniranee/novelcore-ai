import { prisma } from '../lib/prisma';
import { DummyPatentProvider } from '../lib/patent/providers/dummy';
import { getPatentProvider, searchAndIngestPriorArt } from '../lib/patent/service';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { DUMMY_PATENT_DATASET } from '../lib/patent/datasets/dummy-patents';
import { setMockGroqHandler } from '../lib/ai/groq';

async function runDemoModeTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING NOVELCORE AI DEMO MODE VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // --- Test 1: Provider selection under DEMO_MODE ---
  const activeProvider = getPatentProvider();
  assert(
    activeProvider instanceof DummyPatentProvider,
    'Active Patent Provider is DummyPatentProvider when DEMO_MODE=true',
    `Received: ${activeProvider.name}`
  );

  // --- Test 2: Dummy Patent Dataset Size & Variety ---
  assert(
    DUMMY_PATENT_DATASET.length >= 30,
    `Dummy Patent Dataset contains >= 30 records (Found: ${DUMMY_PATENT_DATASET.length})`
  );

  const domains = new Set(DUMMY_PATENT_DATASET.map((d) => d.technologyDomain).filter(Boolean));
  assert(
    domains.size >= 8,
    `Dataset covers multiple distinct technology domains (Found: ${domains.size} domains)`
  );

  // --- Test 3: DummyPatentProvider Search & Retrieval Methods ---
  const dummy = new DummyPatentProvider();

  const searchResults = await dummy.search({ query: 'crop disease', domain: 'Agriculture Technology' });
  assert(
    searchResults.length > 0 && searchResults[0].publicationNumber.startsWith('DEMO-US-'),
    'DummyPatentProvider keyword and domain search returns matched demo patents',
    `First result: ${searchResults[0]?.publicationNumber} - ${searchResults[0]?.title}`
  );

  const getByIdResult = await dummy.getById('DEMO-US-000001');
  assert(
    getByIdResult !== null && getByIdResult.publicationNumber === 'DEMO-US-000001',
    'DummyPatentProvider getById() retrieves specific patent document',
    `Retrieved: ${getByIdResult?.title}`
  );

  const getByPubNumResult = await dummy.getByPublicationNumber('DEMO-US-000012');
  assert(
    getByPubNumResult !== null && getByPubNumResult.publicationNumber === 'DEMO-US-000012',
    'DummyPatentProvider getByPublicationNumber() retrieves correct post-quantum patent',
    `Retrieved: ${getByPubNumResult?.title}`
  );

  // --- Test 4: Database Ingestion & Idempotency ---
  const dbDocCount = await prisma.priorArtDocument.count({
    where: { source: 'DEMO' },
  });
  assert(
    dbDocCount >= 30,
    `PostgreSQL PriorArtDocument table contains seeded demo records (Count: ${dbDocCount})`
  );

  // Ingest single record again to test idempotency
  const ingestTest = await searchAndIngestPriorArt({ query: 'DEMO-US-000001' }, dummy);
  assert(
    ingestTest.length > 0 && ingestTest[0].action === 'updated',
    'searchAndIngestPriorArt updates existing record without duplicate creation'
  );

  // Verify vector embedding exists in pgvector
  const vectorCheck: any[] = await prisma.$queryRawUnsafe(
    `SELECT "publicationNumber", "embeddingModel", "embeddingDim" 
     FROM "prior_art_documents" 
     WHERE "publicationNumber" = 'DEMO-US-000001' AND "embedding" IS NOT NULL`
  );
  assert(
    vectorCheck.length > 0 && vectorCheck[0].embeddingDim === 1536,
    'pgvector column contains 1536-dimensional embedding vector for demo patents'
  );

  // --- Test 5: End-to-End Invention Analysis Pipeline (AgriTech Domain) ---
  console.log('\n--- Testing End-to-End Analysis Pipeline for AgriTech Invention ---');

  setMockGroqHandler(async (options) => {
    if (options.prompt.includes('core technical concepts')) {
      return {
        coreTechnology: 'Spectral Leaf Rust Scanning and Edge Inference',
        technicalProblem: 'Foliar fungal pathogens decimate cereal crop yields before visible yellowing occurs.',
        technicalSolution: 'A swarm of lightweight quadcopters carrying miniature NIR cameras and edge convolutional inference models.',
        components: ['Multispectral NIR Camera', 'Edge Convolutional Processor', 'Dew Point Sensor Array'],
        mechanisms: ['Dual-band reflectance ratio calculation', 'Microclimate dew point calibration'],
        inputs: ['6-band reflectance stream', 'Air temperature and humidity'],
        outputs: ['Early fungal spore probability maps', 'Fungicide micro-dispersion triggers'],
        importantFeatures: ['Dual-band edge ratio calculation', 'Dew point sensor calibration'],
      };
    }
    if (options.prompt.includes('numbered set of specific technical features')) {
      return {
        features: [
          { id: 'F1', name: 'Multispectral Leaf Sensor', description: '6-band narrow NIR sensor array.', isNoveltyCandidate: false },
          { id: 'F2', name: 'Microclimate Dew Point Calibrator', description: 'Real-time dew point compensation circuit.', isNoveltyCandidate: true },
          { id: 'F3', name: 'Edge Inference Kernel', description: 'Embedded neural network computing early infection indexes.', isNoveltyCandidate: true },
        ],
      };
    }
    if (options.prompt.includes('element-by-element comparison')) {
      return {
        comparisons: [
          { patentId: 'DEMO-US-000001', featureId: 'F1', status: 'DISCLOSED', evidenceField: 'abstract', evidenceQuote: 'autonomous aerial drone system equipped with multi-spectral NIR cameras...', explanation: 'Discloses NIR cameras.' },
          { patentId: 'DEMO-US-000001', featureId: 'F2', status: 'NOT_DISCLOSED', evidenceField: 'none', evidenceQuote: 'INSUFFICIENT_EVIDENCE', explanation: 'Does not disclose dew point compensation.' },
          { patentId: 'DEMO-US-000001', featureId: 'F3', status: 'PARTIAL', evidenceField: 'claims', evidenceQuote: 'onboard microprocessor running edge-detection algorithms', explanation: 'Discloses edge detection without rust index modeling.' },
        ],
      };
    }
    if (options.prompt.includes('novelty of the following invention') || options.prompt.includes('Analyze the novelty')) {
      return {
        overallNoveltyAssessment: 'The invention demonstrates patentable novelty in combining dual-band ratio calculations with microclimate dew point calibration.',
        novelFeatures: ['F2: Microclimate Dew Point Calibrator'],
        disclosedFeatures: ['F1: Multispectral Leaf Sensor'],
        differentiationRationale: 'Prior art documents disclose generic NIR cameras but fail to disclose real-time dew point compensation.',
        noveltyRatio: 0.67,
      };
    }
    if (options.prompt.includes('actionable innovation opportunities')) {
      return {
        gaps: [
          { title: 'Closed-Loop Droplet Sizing Telemetry', impact: 'High', whyItMatters: 'Ensures optimal droplet diameter under changing humidity.', expectedImpact: '+15% absorption efficiency', recommendedAction: 'Add optical droplet sizing sensor.' },
          { title: 'Cooperative Swarm Relaying', impact: 'Medium', whyItMatters: 'Extends coverage across large multi-hectare zones.', expectedImpact: '+40% telemetry reliability', recommendedAction: 'Implement mesh ad-hoc routing.' },
        ],
      };
    }
    if (options.prompt.includes('Draft formal patent claims')) {
      return {
        independentClaims: [
          { claimNumber: 1, text: '1. An agricultural monitoring apparatus comprising a multispectral sensor and an edge processor, wherein the edge processor is configured to compute a dual-band vegetation index calibrated against microclimate dew point telemetry.', structuralElements: ['Multispectral sensor', 'Edge processor', 'Dew point calibrator'], noveltyFocus: 'Dew point calibrated vegetation index' },
        ],
        dependentClaims: [
          { claimNumber: 2, parentClaimNumber: 1, text: '2. The apparatus of claim 1, wherein the sensor captures narrow-band NIR reflectance.', limitation: 'Narrow-band NIR capture' },
        ],
      };
    }
    if (options.prompt.includes('Office Action examination')) {
      return {
        objections: [
          { category: 'NOVELTY_102', severity: 'High', title: '35 U.S.C. 102 Rejection over DEMO-US-000001', citedPatentIds: ['DEMO-US-000001'], concern: 'Reference discloses aerial multi-spectral cameras.', evidence: 'DEMO-US-000001 Abstract', recommendation: 'Recite explicit dew point calibration circuitry.' },
          { category: 'OBVIOUSNESS_103', severity: 'Medium', title: '35 U.S.C. 103 Rejection in view of secondary art', citedPatentIds: ['DEMO-US-000002'], concern: 'Combining drones with standard sensors is known.', evidence: 'DEMO-US-000002 Claims', recommendation: 'Emphasize non-obvious synergistic accuracy improvement.' },
        ],
      };
    }
    return {};
  });

  const agriInventionInput = {
    title: 'Autonomous Drone Swarm with Spectral Leaf Rust Scanner',
    problem: 'Foliar fungal pathogens decimate cereal crop yields before visible yellowing occurs.',
    solution: 'A swarm of lightweight quadcopters carrying miniature NIR cameras and edge convolutional inference models.',
    howItWorks: 'UAVs fly low over crop canopies, capturing 6-band multispectral reflectance and streaming detections.',
    advantages: 'Early detection 4 days prior to visual symptoms; 70% reduction in broad-spectrum fungicide use.',
    differentiation: 'Novel dual-band edge ratio calculation calibrated against microclimate dew point sensors.',
    domain: 'Agriculture Technology',
    industry: 'Precision Farming',
  };

  const agriAnalysis = await executeInventionAnalysis(agriInventionInput);
  assert(
    agriAnalysis.analysisRunId !== undefined &&
      agriAnalysis.data.novelty >= 0 &&
      agriAnalysis.data.novelty <= 100,
    'executeInventionAnalysis successfully executes and calculates novelty score',
    `Novelty: ${agriAnalysis.data.novelty}/100, Patentability: ${agriAnalysis.data.patentability}/100`
  );

  assert(
    agriAnalysis.data.priorArt.length > 0 &&
      agriAnalysis.data.priorArt.some(
        (doc) => doc.id === 'DEMO-US-000001' || doc.id === 'DEMO-US-000002' || doc.id === 'DEMO-US-000032'
      ),
    'Vector search retrieves domain-coherent agricultural prior art (DEMO-US-000001 / DEMO-US-000032)',
    `Top cited: ${agriAnalysis.data.priorArt[0].id} - ${agriAnalysis.data.priorArt[0].title}`
  );

  assert(
    agriAnalysis.data.opportunities.length >= 2,
    'Innovation gaps generated with actionable recommendations'
  );

  assert(
    agriAnalysis.data.claims.length >= 2 &&
      agriAnalysis.data.claims[0].optimized.includes('wherein'),
    'Optimized patent claims generated with defensible structural bounds'
  );

  assert(
    agriAnalysis.data.examinerObjections.length >= 2,
    'Examiner review simulated with statutory 102/103 objection rationale'
  );

  // --- Test 6: Coherence on Cybersecurity Invention ---
  console.log('\n--- Testing End-to-End Analysis Pipeline for Cybersecurity Invention ---');
  const cyberInventionInput = {
    title: 'Hardware Module for Lattice-Based Zero-Knowledge Authentication',
    problem: 'Quantum computing algorithms will break conventional RSA and ECC elliptic curve key exchange.',
    solution: 'An ASIC coprocessor implementing polynomial ring multiplication for Module-LWE cryptography.',
    howItWorks: 'Dedicated constant-time NTT butterfly arithmetic units prevent side-channel timing leakage.',
    advantages: 'Post-quantum cryptographic resilience with sub-microsecond signing latency.',
    differentiation: 'Asymmetric dual-core pipeline overlapping proof generation with lattice coefficient sampling.',
    domain: 'Cybersecurity',
    industry: 'Data Protection',
  };

  const cyberAnalysis = await executeInventionAnalysis(cyberInventionInput);
  assert(
    cyberAnalysis.data.priorArt.some((doc) => doc.id === 'DEMO-US-000012' || doc.id === 'DEMO-US-000013' || (doc as any).technology === 'Cybersecurity'),
    'Vector search retrieves domain-coherent cybersecurity prior art (DEMO-US-000012 / DEMO-US-000013)',
    `Top cited: ${cyberAnalysis.data.priorArt[0].id} - ${cyberAnalysis.data.priorArt[0].title}`
  );

  // --- Test 7: Analysis Determinism ---
  const repeatAnalysis = await executeInventionAnalysis(agriInventionInput);
  assert(
    repeatAnalysis.data.novelty === agriAnalysis.data.novelty,
    'Analysis produces deterministic novelty scores on repeated submissions',
    `Run 1: ${agriAnalysis.data.novelty} vs Run 2: ${repeatAnalysis.data.novelty}`
  );

  setMockGroqHandler(null);

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoModeTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
