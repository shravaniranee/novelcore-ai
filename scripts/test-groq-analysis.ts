import { prisma } from '../lib/prisma';
import {
  setMockGroqHandler,
  extractAndParseJson,
  withRetry,
  assertServerOnlyGroq,
  type CompletionOptions,
} from '../lib/ai/groq';
import {
  technicalConceptsSchema,
  technicalFeaturesSchema,
  priorArtComparisonSchema,
  noveltyExplanationSchema,
  innovationAnalysisSchema,
  claimAnalysisSchema,
  examinerAnalysisSchema,
  validatePriorArtComparison,
  type PriorArtComparison,
} from '../lib/validations/agent-outputs';
import { calculateDeterministicNoveltyMetrics } from '../lib/ai/service';
import { executeInventionAnalysis } from '../lib/analysis/engine';

async function runGroqAnalysisTests() {
  console.log('================================================================');
  console.log('🧠 TESTING PHASE 5: GROQ AI ANALYSIS & STRUCTURED REASONING');
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

  // -------------------------------------------------------------------------
  // 1. TEST SERVER-ONLY SECURITY
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Server-Side Groq Security Guards ---');
  try {
    assertServerOnlyGroq();
    assert(true, 'Server-side Groq execution guard passes in Node environment');
  } catch (err: any) {
    assert(false, 'Server-side Groq execution guard failed', err.message);
  }

  // -------------------------------------------------------------------------
  // 2. TEST VALID JSON EXTRACTION & ZOD SCHEMAS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Valid JSON Extraction & Zod Schema Conformance ---');

  const validConceptsInput = {
    coreTechnology: 'Autonomous Agricultural Drone Systems',
    technicalProblem: 'Delayed detection of foliar crop pathogens leads to widespread harvest loss.',
    technicalSolution: 'Edge convolutional neural networks processing multi-spectral imagery on-device.',
    components: ['NIR Sensor', 'Edge TPU', 'Variable-Rate Spraying Nozzle'],
    mechanisms: ['NDVI vegetative index thresholding', 'Real-time wind shear trajectory compensation'],
    inputs: ['Raw multi-spectral frame streams', 'GPS coordinates'],
    outputs: ['Pathogen density heatmap', 'Precision micro-droplet actuator commands'],
    importantFeatures: ['Edge inferencing under 50ms', 'Sub-millimeter droplet size control'],
  };

  const parsedConcepts = technicalConceptsSchema.safeParse(validConceptsInput);
  assert(parsedConcepts.success, 'technicalConceptsSchema successfully validates valid structured input');

  const validFeaturesInput = {
    features: [
      {
        id: 'F1',
        name: 'Multi-Spectral Edge Sensing Node',
        description: 'Sensor array measuring reflectance in 5 distinct narrow wavebands.',
        isNoveltyCandidate: false,
      },
      {
        id: 'F2',
        name: 'Foliar Lesion Inference Engine',
        description: 'Quantized neural network segmenting necrotic foliar regions in under 50ms.',
        isNoveltyCandidate: true,
      },
    ],
  };

  const parsedFeatures = technicalFeaturesSchema.safeParse(validFeaturesInput);
  assert(parsedFeatures.success, 'technicalFeaturesSchema successfully validates numbered features (F1, F2)');

  const validComparisonInput: PriorArtComparison = {
    comparisons: [
      {
        patentId: 'DEMO-US-000001',
        featureId: 'F1',
        status: 'DISCLOSED',
        evidenceField: 'abstract',
        evidenceQuote: 'An autonomous aerial drone system equipped with multi-spectral NIR cameras...',
        explanation: 'The prior art discloses multi-spectral sensor assemblies on aerial drones.',
      },
      {
        patentId: 'DEMO-US-000001',
        featureId: 'F2',
        status: 'NOT_DISCLOSED',
        evidenceField: 'none',
        evidenceQuote: 'INSUFFICIENT_EVIDENCE',
        explanation: 'Reference does not describe on-device foliar lesion segmentation.',
      },
    ],
  };

  const parsedComparison = priorArtComparisonSchema.safeParse(validComparisonInput);
  assert(parsedComparison.success, 'priorArtComparisonSchema successfully validates element-by-element comparisons');

  // -------------------------------------------------------------------------
  // 3. TEST MALFORMED JSON RECOVERY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Malformed JSON & Markdown Code-Fence Recovery ---');

  const markdownWrapped = '```json\n{"coreTechnology": "Quantum Cryptography", "test": true}\n```';
  const parsedMarkdown = extractAndParseJson<{ coreTechnology: string }>(markdownWrapped);
  assert(
    parsedMarkdown.coreTechnology === 'Quantum Cryptography',
    'extractAndParseJson successfully strips markdown code fences ```json ... ```'
  );

  const conversationalWrapped = 'Here is the analysis:\n{"features": [{"id": "F1", "name": "Test"}]}\nThank you.';
  const parsedConversational = extractAndParseJson<{ features: any[] }>(conversationalWrapped);
  assert(
    parsedConversational.features?.length === 1,
    'extractAndParseJson extracts JSON object embedded within conversational prose'
  );

  let caughtMalformed = false;
  try {
    extractAndParseJson('This is completely invalid text with no JSON braces whatsoever.');
  } catch {
    caughtMalformed = true;
  }
  assert(caughtMalformed, 'extractAndParseJson safely throws on completely non-JSON content');

  // -------------------------------------------------------------------------
  // 4. TEST ANTI-HALLUCINATION: INVALID / INVENTED PATENT ID
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Anti-Hallucination: Rejecting Invented Patent IDs ---');

  const hallucinatedPatentComparison: PriorArtComparison = {
    comparisons: [
      {
        patentId: 'US-9999999-B2', // Hallucinated patent NOT in retrieved prior art
        featureId: 'F1',
        status: 'DISCLOSED',
        evidenceField: 'abstract',
        evidenceQuote: 'Fabricated quote...',
        explanation: 'Invented document comparison.',
      },
    ],
  };

  const allowedPatents = ['DEMO-US-000001', 'DEMO-US-000002'];
  const allowedFeatures = ['F1', 'F2'];

  const patentValidation = validatePriorArtComparison(
    hallucinatedPatentComparison,
    allowedPatents,
    allowedFeatures
  );

  assert(
    !patentValidation.valid,
    'validatePriorArtComparison rejects hallucinated patent ID (US-9999999-B2)'
  );
  assert(
    patentValidation.errors.some((e) => e.includes('Hallucinated patent ID')),
    `Validation error message explicitly identifies hallucination (${patentValidation.errors[0]})`
  );

  // -------------------------------------------------------------------------
  // 5. TEST ANTI-HALLUCINATION: INVALID FEATURE ID
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Anti-Hallucination: Rejecting Unmapped Feature IDs ---');

  const invalidFeatureComparison: PriorArtComparison = {
    comparisons: [
      {
        patentId: 'DEMO-US-000001',
        featureId: 'F99', // Invalid feature ID
        status: 'DISCLOSED',
        evidenceField: 'abstract',
        evidenceQuote: 'Some quote...',
        explanation: 'Invalid feature comparison.',
      },
    ],
  };

  const featureValidation = validatePriorArtComparison(
    invalidFeatureComparison,
    allowedPatents,
    allowedFeatures
  );

  assert(
    !featureValidation.valid,
    'validatePriorArtComparison rejects invalid feature ID (F99)'
  );
  assert(
    featureValidation.errors.some((e) => e.includes('Invalid feature ID')),
    `Validation error message explicitly identifies invalid feature (${featureValidation.errors[0]})`
  );

  // -------------------------------------------------------------------------
  // 6. TEST EVIDENCE GROUNDING: MISSING EVIDENCE
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Evidence Grounding: Requiring Field & Text Citations ---');

  const missingEvidenceComparison: PriorArtComparison = {
    comparisons: [
      {
        patentId: 'DEMO-US-000001',
        featureId: 'F1',
        status: 'DISCLOSED',
        evidenceField: 'none', // Violation: DISCLOSED but evidenceField is none
        evidenceQuote: '', // Violation: empty quote
        explanation: 'Claims disclosure without citing evidence.',
      },
    ],
  };

  const evidenceValidation = validatePriorArtComparison(
    missingEvidenceComparison,
    allowedPatents,
    allowedFeatures
  );

  assert(
    !evidenceValidation.valid,
    'validatePriorArtComparison rejects DISCLOSED status with evidenceField="none"'
  );
  assert(
    evidenceValidation.errors.length >= 2,
    `Flags both evidenceField="none" and empty quote (Errors: ${evidenceValidation.errors.length})`
  );

  // -------------------------------------------------------------------------
  // 7. TEST SAFE RETRY HANDLING (SIMULATED 429 RATE LIMIT)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Safe Retry Logic on Transient Rate Limits (429) ---');

  let callCount = 0;
  const retryResult = await withRetry(
    async () => {
      callCount++;
      if (callCount < 3) {
        const error: any = new Error('Rate limit exceeded: 429 Too Many Requests');
        error.status = 429;
        throw error;
      }
      return 'RECOVERED_SUCCESSFULLY';
    },
    3,
    50 // Fast backoff for unit tests
  );

  assert(
    retryResult === 'RECOVERED_SUCCESSFULLY',
    'withRetry successfully recovers after transient 429 rate-limit failures'
  );
  assert(
    callCount === 3,
    `withRetry executed exactly 3 attempts before succeeding (Count: ${callCount})`
  );

  let failedRetryTerminated = false;
  try {
    await withRetry(
      async () => {
        const error: any = new Error('Persistent 500 Internal Server Error');
        error.status = 500;
        throw error;
      },
      2,
      20
    );
  } catch {
    failedRetryTerminated = true;
  }

  assert(
    failedRetryTerminated,
    'withRetry does not endlessly loop; safely terminates and throws after max retries'
  );

  // -------------------------------------------------------------------------
  // 8. TEST DETERMINISTIC NOVELTY & PATENTABILITY SCORING
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Testing Deterministic Score Calculation from Feature Matrix ---');

  const testFeatureSet = {
    features: [
      { id: 'F1', name: 'Sensor', description: 'desc', isNoveltyCandidate: false },
      { id: 'F2', name: 'Edge TPU', description: 'desc', isNoveltyCandidate: true },
      { id: 'F3', name: 'Novel Closed Loop', description: 'desc', isNoveltyCandidate: true },
      { id: 'F4', name: 'Dynamic Actuator', description: 'desc', isNoveltyCandidate: false },
    ],
  };

  const testComparisons: PriorArtComparison = {
    comparisons: [
      { patentId: 'DEMO-US-000001', featureId: 'F1', status: 'DISCLOSED', evidenceField: 'abstract', evidenceQuote: '...', explanation: '...' },
      { patentId: 'DEMO-US-000001', featureId: 'F2', status: 'PARTIAL', evidenceField: 'title', evidenceQuote: '...', explanation: '...' },
      { patentId: 'DEMO-US-000001', featureId: 'F3', status: 'NOT_DISCLOSED', evidenceField: 'none', evidenceQuote: 'INSUFFICIENT_EVIDENCE', explanation: '...' },
      { patentId: 'DEMO-US-000001', featureId: 'F4', status: 'DISCLOSED', evidenceField: 'abstract', evidenceQuote: '...', explanation: '...' },
    ],
  };

  const metric1 = calculateDeterministicNoveltyMetrics(testFeatureSet, testComparisons, 0.72);
  const metric2 = calculateDeterministicNoveltyMetrics(testFeatureSet, testComparisons, 0.72);

  assert(
    metric1.noveltyScore === metric2.noveltyScore,
    `Novelty score is 100% deterministic on repeat calculations (${metric1.noveltyScore} === ${metric2.noveltyScore})`
  );
  assert(
    metric1.noveltyScore >= 58 && metric1.noveltyScore <= 95,
    `Novelty score falls strictly within statutory bounds 58-95 (${metric1.noveltyScore})`
  );
  assert(
    metric1.patentabilityScore >= 62 && metric1.patentabilityScore <= 94,
    `Patentability score falls strictly within bounds 62-94 (${metric1.patentabilityScore})`
  );

  // -------------------------------------------------------------------------
  // 9. TEST END-TO-END ANALYSIS PIPELINE WITH MOCKED GROQ HANDLER
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Testing End-to-End Pipeline Execution with Mocked Groq Handler ---');

  // Install custom mock handler
  setMockGroqHandler(async (options: CompletionOptions) => {
    if (options.prompt.includes('core technical concepts')) {
      return {
        coreTechnology: 'Multi-Spectral Foliar Pathogen Imaging',
        technicalProblem: 'Uncontrolled fungal crop blight spreads prior to visible symptoms.',
        technicalSolution: 'On-drone multispectral computer vision triggering micro-droplet fungicides.',
        components: ['Multispectral sensor array', 'Edge convolutional accelerator', 'Localized droplet manifold'],
        mechanisms: ['Vegetative reflectance ratio calculation', 'Dynamic micro-actuation'],
        inputs: ['Spectral reflectance telemetry', 'Airspeed sensor data'],
        outputs: ['Lesion coordinates', 'Dispersion pulse telemetry'],
        importantFeatures: ['Sub-50ms inference cycle', 'Selective micro-nozzle actuation'],
      };
    }

    if (options.prompt.includes('numbered set of specific technical features')) {
      return {
        features: [
          { id: 'F1', name: 'Multispectral Sensor Array', description: '5-band narrow spectrum sensor array.', isNoveltyCandidate: false },
          { id: 'F2', name: 'Edge Foliar Lesion Accelerator', description: 'Embedded neural network computing NDVI ratios in <50ms.', isNoveltyCandidate: true },
          { id: 'F3', name: 'Closed-Loop Micro-Nozzle Manifold', description: 'Localized pressure-compensated fungicide spray nozzles.', isNoveltyCandidate: true },
        ],
      };
    }

    if (options.prompt.includes('element-by-element comparison')) {
      return {
        comparisons: [
          {
            patentId: 'DEMO-US-000001',
            featureId: 'F1',
            status: 'DISCLOSED',
            evidenceField: 'abstract',
            evidenceQuote: 'multi-spectral NIR cameras and edge convolutional neural networks...',
            explanation: 'DEMO-US-000001 describes an identical aerial multi-spectral sensor payload.',
          },
          {
            patentId: 'DEMO-US-000001',
            featureId: 'F2',
            status: 'PARTIAL',
            evidenceField: 'abstract',
            evidenceQuote: 'edge convolutional neural networks that detects early-stage fungal foliar lesions...',
            explanation: 'Discloses edge neural networks for lesions, but does not specify sub-50ms latency bounds.',
          },
          {
            patentId: 'DEMO-US-000001',
            featureId: 'F3',
            status: 'DISCLOSED',
            evidenceField: 'abstract',
            evidenceQuote: 'selectively actuates droplet micro-nozzles...',
            explanation: 'Discloses micro-nozzles actuated in response to detected lesions.',
          },
        ],
      };
    }

    if (options.prompt.includes('Analyze the novelty of the following invention') || options.prompt.includes('novelty of the following invention')) {
      return {
        overallNoveltyAssessment:
          'The invention demonstrates focused novelty in sub-50ms real-time inferential latency paired with synchronized localized spraying.',
        novelFeatures: ['F2: Sub-50ms latency bounds on embedded neural accelerator'],
        disclosedFeatures: ['F1: Multispectral camera', 'F3: Micro-droplet nozzles'],
        differentiationRationale:
          'Prior art references rely on post-flight batch processing or high-latency cloud pipelines.',
      };
    }

    if (options.prompt.includes('actionable innovation opportunities')) {
      return {
        gaps: [
          {
            title: 'Adaptive Wind Shear Micro-Compensation',
            impact: 'High',
            whyItMatters: 'Mitigates droplet drift caused by cross-winds during flight.',
            expectedImpact: 'Improves chemical targeting efficiency by 40%.',
            recommendedAction: 'Incorporate ultrasonic wind velocity sensors into nozzle telemetry.',
          },
        ],
      };
    }

    if (options.prompt.includes('Draft formal patent claims')) {
      return {
        independentClaims: [
          {
            claimNumber: 1,
            text: '1. An agricultural monitoring apparatus comprising a multispectral camera, an edge neural processor executing inference in under 50ms, and a localized micro-nozzle manifold.',
            structuralElements: ['Multispectral camera', 'Edge neural processor', 'Micro-nozzle manifold'],
            noveltyFocus: 'Sub-50ms edge foliar lesion inferential loop',
          },
        ],
        dependentClaims: [
          {
            claimNumber: 2,
            parentClaimNumber: 1,
            text: '2. The apparatus of claim 1, further comprising an ultrasonic wind anemometer.',
            limitation: 'Ultrasonic wind anemometer integration',
          },
        ],
      };
    }

    if (options.prompt.includes('Office Action examination')) {
      return {
        objections: [
          {
            category: 'NOVELTY_102',
            severity: 'High',
            title: '35 U.S.C. 102 Anticipation Rejection over DEMO-US-000001',
            citedPatentIds: ['DEMO-US-000001'],
            concern: 'DEMO-US-000001 discloses an aerial UAV with multi-spectral NIR cameras and micro-nozzles.',
            evidence: 'See DEMO-US-000001 Abstract and Claims 1-3.',
            recommendation: 'Amend Claim 1 to explicitly recite the sub-50ms latency constraint.',
          },
        ],
      };
    }

    return {};
  });

  let e2eResult: any;
  try {
    e2eResult = await executeInventionAnalysis({
      title: 'Precision Aerial Agricultural Blight Neutralizer',
      problem: 'Fungal leaf blight undetected in early stages causes irreversible field necrosis.',
      solution: 'UAV platform executing sub-50ms neural inference with precision fungicide spraying.',
      howItWorks: 'Multispectral cameras stream frame packets to edge TPUs actuating micro-nozzles.',
      advantages: '90% reduction in chemical volume and zero spray drift.',
      differentiation: 'Sub-50ms closed-loop latency boundary between detection and nozzle trigger.',
      domain: 'Agriculture Technology',
      industry: 'AgriTech',
    });
  } catch (err: any) {
    setMockGroqHandler(null);
    console.error('e2e error message:', err?.message || err);
    console.error('e2e error stack:', err?.stack);
    throw new Error(`e2e test failed: ${err?.message || err}`);
  }

  // Reset mock handler to ensure test cleanliness
  setMockGroqHandler(null);

  assert(
    !!e2eResult.analysisRunId,
    `End-to-end analysis executed successfully with Groq AI (Run ID: ${e2eResult.analysisRunId})`
  );
  assert(
    e2eResult.data.novelty >= 58 && e2eResult.data.novelty <= 95,
    `Novelty score produced: ${e2eResult.data.novelty}`
  );
  assert(
    e2eResult.data.opportunities.length > 0,
    `Actionable innovation opportunities generated: ${e2eResult.data.opportunities.length}`
  );

  // Verify database persistence
  const savedRun = await prisma.analysisRun.findUnique({
    where: { id: e2eResult.analysisRunId },
  });
  assert(
    savedRun?.status === 'COMPLETED',
    'AnalysisRun record in PostgreSQL is marked COMPLETED'
  );
  assert(
    !!savedRun?.understanding,
    `AnalysisRun understanding persisted in PostgreSQL (${(savedRun?.understanding || '').substring(0, 50)}...)`
  );

  console.log('\n================================================================');
  console.log(`GROQ AI ANALYSIS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGroqAnalysisTests()
  .catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
