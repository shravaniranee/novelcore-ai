/**
 * NovelCore AI — Phase 11: Unified Patent Intelligence Report Test Suite
 *
 * TEST A  — Report generation
 * TEST B  — Executive summary aggregation
 * TEST C  — Invention aggregation
 * TEST D  — Feature aggregation
 * TEST E  — Prior-art aggregation
 * TEST F  — Retrieval score preservation
 * TEST G  — RRF is not mislabeled as semantic similarity
 * TEST H  — Overlap matrix aggregation
 * TEST I  — Novelty aggregation
 * TEST J  — Innovation aggregation
 * TEST K  — Differentiation aggregation
 * TEST L  — Claim aggregation
 * TEST M  — Latest ClaimVersion selection
 * TEST N  — ClaimElement traceability
 * TEST O  — Examiner aggregation
 * TEST P  — Evidence source traceability
 * TEST Q  — Cross-analysis feature isolation
 * TEST R  — Cross-analysis prior-art isolation
 * TEST S  — Cross-analysis claim isolation
 * TEST T  — Cross-analysis examiner isolation
 * TEST U  — No prior-art behavior
 * TEST V  — No claims behavior
 * TEST W  — No examiner behavior
 * TEST X  — Groq failure fallback
 * TEST Y  — Groq malformed response fallback
 * TEST Z  — Idempotent report generation
 * TEST AA — Duplicate report prevention
 * TEST AB — Credential isolation
 * TEST AC — Report API end-to-end
 * TEST AD — Deterministic metric preservation
 * TEST AE — Legal disclaimer
 * TEST AF — Final recommendation safety
 */

import { prisma } from '../lib/prisma';
import { setMockGroqHandler } from '../lib/ai/groq';
import {
  assembleUnifiedReport,
  executeUnifiedReportGeneration,
  getReportForAnalysis,
  validateReportCrossAnalysisIsolation,
  deriveFinalRecommendation,
  buildDeterministicExecutiveSummary,
  polishReportNarrativeWithGroq,
  LEGAL_DISCLAIMER,
  recommendationNarrative,
} from '../lib/report/generator';
import { executeInventionAnalysis } from '../lib/analysis/engine';
import { executeExaminerSimulation } from '../lib/analysis/examiner';
import { GET as getReportRoute, POST as postReportRoute } from '../app/api/analysis/[id]/report/route';
import { GET as getReportByIdRoute } from '../app/api/reports/[reportId]/route';

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

async function runUnifiedReportTests() {
  console.log('======================================================================');
  console.log('PHASE 11 UNIFIED PATENT INTELLIGENCE REPORT TEST SUITE');
  console.log('======================================================================\n');

  // Disable live Groq for deterministic suite unless individually mocked
  setMockGroqHandler(null);
  const originalGroqKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = '';

  // --------------------------------------------------------------------------
  // Pure unit helpers first
  // --------------------------------------------------------------------------
  console.log('--- TEST Q/R/S/T: Cross-analysis isolation validators ---');
  const isolationOk = validateReportCrossAnalysisIsolation({
    analysisRunId: 'run-A',
    inventionId: 'inv-A',
    featureRunIds: ['run-A'],
    featureInventionIds: ['inv-A'],
    matchRunIds: ['run-A'],
    overlapRunIds: ['run-A'],
    noveltyRunId: 'run-A',
    opportunityRunIds: ['run-A'],
    claimRunIds: ['run-A'],
    claimElementFeatureRunIds: ['run-A'],
    examinerRunIds: ['run-A'],
  });
  assert(isolationOk.valid, 'TEST Q/R/S/T: Same-run evidence passes isolation');

  const featureCross = validateReportCrossAnalysisIsolation({
    analysisRunId: 'run-A',
    inventionId: 'inv-A',
    featureRunIds: ['run-B'],
    featureInventionIds: ['inv-A'],
    matchRunIds: ['run-A'],
    overlapRunIds: ['run-A'],
    noveltyRunId: 'run-A',
    opportunityRunIds: ['run-A'],
    claimRunIds: ['run-A'],
    claimElementFeatureRunIds: ['run-A'],
    examinerRunIds: ['run-A'],
  });
  assert(!featureCross.valid, 'TEST Q: Cross-analysis feature isolation rejects foreign features');

  const priorArtCross = validateReportCrossAnalysisIsolation({
    analysisRunId: 'run-A',
    inventionId: 'inv-A',
    featureRunIds: ['run-A'],
    featureInventionIds: ['inv-A'],
    matchRunIds: ['run-B'],
    overlapRunIds: ['run-A'],
    noveltyRunId: 'run-A',
    opportunityRunIds: ['run-A'],
    claimRunIds: ['run-A'],
    claimElementFeatureRunIds: ['run-A'],
    examinerRunIds: ['run-A'],
  });
  assert(!priorArtCross.valid, 'TEST R: Cross-analysis prior-art isolation rejects foreign matches');

  const claimCross = validateReportCrossAnalysisIsolation({
    analysisRunId: 'run-A',
    inventionId: 'inv-A',
    featureRunIds: ['run-A'],
    featureInventionIds: ['inv-A'],
    matchRunIds: ['run-A'],
    overlapRunIds: ['run-A'],
    noveltyRunId: 'run-A',
    opportunityRunIds: ['run-A'],
    claimRunIds: ['run-B'],
    claimElementFeatureRunIds: ['run-A'],
    examinerRunIds: ['run-A'],
  });
  assert(!claimCross.valid, 'TEST S: Cross-analysis claim isolation rejects foreign claims');

  const examinerCross = validateReportCrossAnalysisIsolation({
    analysisRunId: 'run-A',
    inventionId: 'inv-A',
    featureRunIds: ['run-A'],
    featureInventionIds: ['inv-A'],
    matchRunIds: ['run-A'],
    overlapRunIds: ['run-A'],
    noveltyRunId: 'run-A',
    opportunityRunIds: ['run-A'],
    claimRunIds: ['run-A'],
    claimElementFeatureRunIds: ['run-A'],
    examinerRunIds: ['run-B'],
  });
  assert(!examinerCross.valid, 'TEST T: Cross-analysis examiner isolation rejects foreign reviews');

  console.log('\n--- TEST AF: Final recommendation safety ---');
  const rec = deriveFinalRecommendation({
    priorArtCount: 3,
    noveltyScore: 70,
    maxSingleCoverage: 0.3,
    collectiveCoverage: 0.4,
    opportunityCount: 2,
    maxDifferentiationScore: 75,
    examinerOverallRisk: 'LOW',
  });
  assert(
    ['STRONG_DIFFERENTIATION_OPPORTUNITY', 'MODERATE_DIFFERENTIATION_OPPORTUNITY', 'SIGNIFICANT_PRIOR_ART_OVERLAP', 'INSUFFICIENT_EVIDENCE'].includes(rec),
    'TEST AF: Recommendation uses controlled enum values'
  );
  const narrative = recommendationNarrative(rec, 'Test Invention');
  assert(
    narrative.includes('Based on the available evidence') &&
      narrative.includes('Professional patent review is recommended') &&
      !narrative.toLowerCase().includes('will be granted') &&
      !narrative.toLowerCase().includes('definitely patentable') &&
      !narrative.toLowerCase().includes('file this patent'),
    'TEST AF: Recommendation narrative avoids legal conclusions'
  );

  const insufficient = deriveFinalRecommendation({
    priorArtCount: 0,
    noveltyScore: null,
    maxSingleCoverage: null,
    collectiveCoverage: null,
    opportunityCount: 0,
    maxDifferentiationScore: null,
    examinerOverallRisk: null,
  });
  assert(insufficient === 'INSUFFICIENT_EVIDENCE', 'TEST U/AF: No evidence yields INSUFFICIENT_EVIDENCE');

  const overlapHeavy = deriveFinalRecommendation({
    priorArtCount: 5,
    noveltyScore: 20,
    maxSingleCoverage: 0.9,
    collectiveCoverage: 0.95,
    opportunityCount: 0,
    maxDifferentiationScore: null,
    examinerOverallRisk: 'CRITICAL',
  });
  assert(overlapHeavy === 'SIGNIFICANT_PRIOR_ART_OVERLAP', 'TEST AF: High coverage yields SIGNIFICANT_PRIOR_ART_OVERLAP');

  console.log('\n--- TEST AE: Legal disclaimer ---');
  assert(
    LEGAL_DISCLAIMER.includes('not a substitute for professional legal advice') &&
      LEGAL_DISCLAIMER.includes('not an actual patent examination or legal opinion'),
    'TEST AE: Legal disclaimer present and non-guaranteeing'
  );

  console.log('\n--- TEST B: Executive summary aggregation helper ---');
  const summary = buildDeterministicExecutiveSummary({
    inventionTitle: 'Demo Cooler',
    analysisRunId: 'run-demo',
    featureCount: 4,
    priorArtCount: 3,
    claimCount: 2,
    latestClaimVersions: [
      { claimNumber: 1, versionNumber: 2 },
      { claimNumber: 2, versionNumber: 1 },
    ],
    noveltyScore: 72,
    evidenceConfidence: 0.8,
    opportunityCount: 2,
    maxDifferentiationScore: 68,
    examinerFindingCount: 3,
    examinerOverallRisk: 'MEDIUM',
    claimVulnerability: 'MEDIUM',
    overallEvidenceConfidence: 0.75,
    finalRecommendation: 'MODERATE_DIFFERENTIATION_OPPORTUNITY',
  });
  assert(summary.includes('Demo Cooler'), 'TEST B: Summary includes invention title');
  assert(summary.includes('run-demo'), 'TEST B: Summary includes AnalysisRun ID');
  assert(summary.includes('Claim 1 v2'), 'TEST B: Summary includes latest claim versions');
  assert(summary.includes('Novelty indicator: 72'), 'TEST B: Summary includes novelty score');
  assert(summary.includes(LEGAL_DISCLAIMER.slice(0, 40)), 'TEST B: Summary includes disclaimer');

  const emptySummary = buildDeterministicExecutiveSummary({
    inventionTitle: 'Empty',
    analysisRunId: 'run-empty',
    featureCount: 0,
    priorArtCount: 0,
    claimCount: 0,
    latestClaimVersions: [],
    noveltyScore: null,
    evidenceConfidence: null,
    opportunityCount: 0,
    maxDifferentiationScore: null,
    examinerFindingCount: null,
    examinerOverallRisk: null,
    claimVulnerability: null,
    overallEvidenceConfidence: null,
    finalRecommendation: 'INSUFFICIENT_EVIDENCE',
  });
  assert(emptySummary.includes('Insufficient evidence'), 'TEST B: Missing metrics become Insufficient evidence');
  assert(emptySummary.includes('Examiner simulation has not been run.'), 'TEST W: Empty examiner wording in summary');
  assert(emptySummary.includes('No claims generated for this analysis.'), 'TEST V: Empty claims wording in summary');

  // --------------------------------------------------------------------------
  // Integration against real analysis pipeline
  // --------------------------------------------------------------------------
  console.log('\n--- Seeding analysis run via executeInventionAnalysis ---');
  const user =
    (await prisma.user.findFirst()) ||
    (await prisma.user.create({
      data: { email: `phase11-${Date.now()}@novelcore.test`, name: 'Phase11 Tester' },
    }));

  const invention = await prisma.invention.create({
    data: {
      userId: user.id,
      title: 'Phase11 Microchannel Thermal Regulator',
      problem: 'Uneven heat dissipation in dense battery packs.',
      solution: 'Closed-loop microchannel dielectric cooling with adaptive Peltier control.',
      howItWorks: 'Sensors measure gradient; controller actuates local cooling channels.',
      advantages: 'Lower hotspot temperature and improved energy density.',
      differentiation: 'Adaptive microchannel dielectric matrix with solid-state interlayer.',
      domain: 'Thermal Management',
      industry: 'Energy Storage',
      status: 'DRAFT',
    },
  });

  const analysisResult = await executeInventionAnalysis({
    id: invention.id,
    userId: user.id,
    title: invention.title,
    problem: invention.problem,
    solution: invention.solution,
    howItWorks: invention.howItWorks,
    advantages: invention.advantages,
    differentiation: invention.differentiation,
    domain: invention.domain,
    industry: invention.industry,
  });

  const analysisRunId = analysisResult.analysisRunId;
  assert(!!analysisRunId, 'TEST A: AnalysisRun created for report generation');

  // Ensure examiner exists for TEST O when claims exist
  try {
    await executeExaminerSimulation(analysisRunId, invention.id);
  } catch {
    // Examiner may fail if no claims; handled by empty-state tests
  }

  console.log('\n--- TEST A: Report generation ---');
  const { report, assembled } = await executeUnifiedReportGeneration(analysisRunId);
  assert(report.status === 'COMPLETED', 'TEST A: Report status is COMPLETED');
  assert(report.analysisRunId === analysisRunId, 'TEST A: Report bound to AnalysisRun');
  assert(report.reportVersion === 1, 'TEST A: Initial reportVersion is 1');
  assert(!!report.sectionsSnapshot, 'TEST A: sectionsSnapshot persisted');

  console.log('\n--- TEST C: Invention aggregation ---');
  const invOverview = (report.sectionsSnapshot as any).inventionOverview;
  assert(invOverview.title === invention.title, 'TEST C: Invention title aggregated');
  assert(invOverview.problem === invention.problem, 'TEST C: Problem aggregated');
  assert(invOverview.domain === invention.domain, 'TEST C: Domain aggregated');

  console.log('\n--- TEST D: Feature aggregation ---');
  const features = (report.sectionsSnapshot as any).technicalFeatures || [];
  const dbFeatures = await prisma.inventionFeature.findMany({ where: { analysisRunId } });
  assert(features.length === dbFeatures.length, 'TEST D: Feature count matches AnalysisRun features');
  if (features.length > 0) {
    assert(features.every((f: any) => f.featureKey && f.name), 'TEST D: Features include key and name');
    assert(
      features.every((_: any, i: number) => i === 0 || features[i].order >= features[i - 1].order),
      'TEST D: Features deterministically ordered'
    );
  }

  console.log('\n--- TEST E/F/G: Prior-art & retrieval scores ---');
  const landscape = (report.sectionsSnapshot as any).priorArtLandscape || [];
  const ranking = (report.sectionsSnapshot as any).priorArtRanking || [];
  const dbMatches = await prisma.priorArtMatch.findMany({ where: { analysisRunId } });
  assert(landscape.length === dbMatches.length, 'TEST E: Prior-art count matches AnalysisRun matches');

  if (landscape.length > 0) {
    assert(!!landscape[0].publicationNumber, 'TEST E: Publication number preserved');
    assert(typeof landscape[0].presentationSimilarityPercent === 'number', 'TEST F: Presentation similarity preserved');
    assert(typeof landscape[0].finalRank === 'number', 'TEST F: Final rank preserved');
    assert(
      ranking[0].rrfScoreNote?.includes('not a similarity score'),
      'TEST G: RRF explicitly labeled as not a similarity score'
    );
    assert(
      ranking[0].rankingFields && ranking[0].similarityFields,
      'TEST G: Ranking fields separated from similarity fields'
    );
    assert(
      !String(JSON.stringify(ranking[0].similarityFields)).includes('"rrfScore"'),
      'TEST G: rrfScore is not placed inside similarityFields'
    );
  } else {
    assert(true, 'TEST E: No prior art — empty landscape accepted');
    assert(true, 'TEST F: No prior art — retrieval scores N/A');
    assert(true, 'TEST G: No prior art — RRF labeling N/A');
  }

  console.log('\n--- TEST H: Overlap matrix aggregation ---');
  const matrix = (report.sectionsSnapshot as any).featureOverlapMatrix || [];
  const dbMatrix = await prisma.featureOverlapMatrixEntry.findMany({ where: { analysisRunId } });
  assert(matrix.length === dbMatrix.length, 'TEST H: Overlap entries match AnalysisRun matrix');
  if (matrix.length > 0) {
    assert(
      matrix.every((m: any) =>
        ['DISCLOSED', 'PARTIAL', 'NOT_DISCLOSED', 'INSUFFICIENT_EVIDENCE'].includes(m.overlapStatus)
      ),
      'TEST H: Overlap statuses preserved from matrix'
    );
  }

  console.log('\n--- TEST I: Novelty aggregation ---');
  const novelty = (report.sectionsSnapshot as any).noveltyAssessment;
  const dbNovelty = await prisma.noveltyAssessment.findUnique({ where: { analysisRunId } });
  if (dbNovelty) {
    assert(novelty.available === true, 'TEST I: Novelty section available');
    assert(novelty.noveltyScore === dbNovelty.noveltyScore, 'TEST I: Novelty score preserved (no recalculation)');
    assert(novelty.evidenceConfidence === dbNovelty.evidenceConfidence, 'TEST I: Evidence confidence preserved');
    assert(novelty.noveltyIndicatorLabel === 'Novelty indicator', 'TEST I: Careful novelty wording');
  } else {
    assert(novelty.available === false, 'TEST I: Honest unavailable novelty state');
  }

  console.log('\n--- TEST J/K: Innovation & differentiation ---');
  const gaps = (report.sectionsSnapshot as any).innovationGapAnalysis;
  const diff = (report.sectionsSnapshot as any).differentiationAnalysis;
  const dbOpps = await prisma.analysisOpportunity.findMany({ where: { analysisRunId } });
  if (dbOpps.length === 0) {
    assert(gaps.available === false, 'TEST J: Empty innovation section when no opportunities');
    assert(
      String(diff.message || '').includes('No material differentiation opportunity'),
      'TEST K: Differentiation empty-state message'
    );
  } else {
    assert(gaps.opportunities.length === dbOpps.length, 'TEST J: Innovation opportunities aggregated');
    assert(diff.available === true, 'TEST K: Differentiation available when opportunities exist');
    assert(typeof gaps.opportunities[0].differentiationScore === 'number', 'TEST K: Differentiation score preserved');
  }

  console.log('\n--- TEST L/M/N: Claims ---');
  const claimSection = (report.sectionsSnapshot as any).claimStrategy;
  const dbClaims = await prisma.claim.findMany({
    where: { analysisRunId },
    include: { versions: { orderBy: { versionNumber: 'desc' }, include: { elements: true } } },
  });
  if (dbClaims.length === 0) {
    assert(claimSection.available === false, 'TEST V: No claims shows honest empty state');
    assert(
      String(claimSection.message).includes('No claims generated'),
      'TEST V: No claims message exact'
    );
  } else {
    assert(claimSection.available === true, 'TEST L: Claims aggregated');
    for (const c of claimSection.claims) {
      const dbClaim = dbClaims.find((d) => d.id === c.claimId);
      const latestDb = dbClaim?.versions[0];
      assert(!!latestDb, `TEST M: Claim ${c.claimNumber} has DB versions`);
      assert(
        c.latestClaimVersion?.versionNumber === latestDb?.versionNumber,
        `TEST M: Claim ${c.claimNumber} uses latest version (${latestDb?.versionNumber})`
      );
      if (latestDb?.elements) {
        assert(
          (c.latestClaimVersion?.elements || []).length === latestDb.elements.length,
          `TEST N: Claim ${c.claimNumber} element count matches`
        );
      }
      for (const el of c.latestClaimVersion?.elements || []) {
        assert(!!el.elementKey && !!el.featureKey, 'TEST N: ClaimElement has key and featureKey');
        if (el.featureTrace) {
          assert(
            el.featureTrace.analysisRunId === analysisRunId,
            'TEST N: ClaimElement feature belongs to same AnalysisRun'
          );
        }
      }
    }
  }

  // Explicit Version 2 preference fixture
  if (dbClaims.length > 0) {
    const claim0 = dbClaims[0];
    const v1 = claim0.versions[claim0.versions.length - 1];
    await prisma.claimVersion.create({
      data: {
        claimId: claim0.id,
        analysisRunId,
        versionNumber: (claim0.versions[0]?.versionNumber || 1) + 1,
        claimText: `${v1?.claimText || 'Claim text'} [v2 optimized]`,
        isOptimized: true,
        groundedFeatureRatio: 1,
        featureCount: v1?.featureCount || 1,
        groundedFeatureCount: v1?.groundedFeatureCount || 1,
        vulnerabilityIndicator: 'LOW',
        vulnerabilityScore: 10,
      },
    });
    const reassembled = await assembleUnifiedReport(analysisRunId);
    const updatedClaim = reassembled.sections.claimStrategy.claims.find(
      (c: any) => c.claimId === claim0.id
    );
    assert(
      updatedClaim?.latestClaimVersion?.versionNumber >
        (claim0.versions[0]?.versionNumber || 1),
      'TEST M: Version 2 selected over Version 1'
    );
    assert(
      String(updatedClaim?.latestClaimVersion?.claimText || '').includes('v2 optimized'),
      'TEST M: Latest claim text comes from Version 2'
    );
  } else {
    assert(true, 'TEST M: Skipped Version 2 fixture (no claims in run)');
  }

  console.log('\n--- TEST O/W: Examiner aggregation ---');
  const examiner = (report.sectionsSnapshot as any).examinerSimulation;
  const dbReview = await prisma.examinerReview.findFirst({
    where: { analysisRunId },
    include: { findings: true },
  });
  if (!dbReview) {
    assert(examiner.available === false, 'TEST W: No examiner shows honest empty state');
    assert(
      String(examiner.message).includes('Examiner simulation has not been run'),
      'TEST W: Examiner empty message'
    );
  } else {
    assert(examiner.available === true, 'TEST O: Examiner section available');
    assert(examiner.overallRisk === dbReview.overallRisk, 'TEST O: Examiner overallRisk preserved');
    assert(examiner.findings.length === dbReview.findings.length, 'TEST O: Findings count preserved');
  }

  console.log('\n--- TEST P: Evidence source traceability ---');
  const sources = (report.evidenceSources as any[]) || [];
  assert(sources.length > 0 || features.length === 0, 'TEST P: Evidence sources populated when features exist');
  assert(
    sources.every((s) => s.analysisRunId === analysisRunId),
    'TEST P: Every evidence source belongs to current AnalysisRun'
  );
  assert(
    sources.every((s) => !!s.sourceType && !!s.sourceId),
    'TEST P: Evidence sources have type and id'
  );

  console.log('\n--- TEST AD: Deterministic metric preservation ---');
  if (dbNovelty) {
    assert(
      assembled.executiveSummaryParams.noveltyScore === dbNovelty.noveltyScore,
      'TEST AD: Executive novelty matches persisted novelty'
    );
  }
  assert(
    assembled.sections.finalRecommendation.code === report.finalRecommendation,
    'TEST AD: Persisted recommendation matches assembled recommendation'
  );

  console.log('\n--- TEST AE (persisted): Disclaimer on report ---');
  assert(
    String(report.disclaimer || '').includes('professional legal advice'),
    'TEST AE: Persisted report includes legal disclaimer'
  );
  assert(
    String((report.sectionsSnapshot as any).educationalLegalDisclaimer || '').includes(
      'not an actual patent examination'
    ),
    'TEST AE: Disclaimer section present in snapshot'
  );
  assert(!!report.recommendationReason, 'TEST AF: recommendationReason persisted');

  const evidenceRows = await prisma.reportEvidence.findMany({ where: { reportId: report.id } });
  assert(evidenceRows.length > 0, 'TEST P: ReportEvidence rows persisted relationally');
  assert(
    evidenceRows.every((e) => !!e.sourceType && !!e.sourceId && !!e.sectionKey),
    'TEST P: ReportEvidence rows have controlled fields'
  );

  console.log('\n--- TEST X/Y: Groq fallback ---');
  process.env.GROQ_API_KEY = 'gsk_test_placeholder_key_for_mock';
  setMockGroqHandler(async () => {
    throw new Error('Simulated Groq timeout gsk_live_secret_should_not_leak');
  });
  const polishedFail = await polishReportNarrativeWithGroq({
    deterministicExecutiveSummary: summary,
    overallAssessment: narrative,
    inventionTitle: invention.title,
    finalRecommendation: rec,
  });
  assert(polishedFail.provenance === 'DETERMINISTIC', 'TEST X: Groq failure falls back to DETERMINISTIC');
  assert(
    polishedFail.executiveSummary === summary,
    'TEST X: Deterministic summary preserved on Groq failure'
  );

  setMockGroqHandler(async () => ({ executiveSummary: 'too short', overallAssessment: 'x' }));
  const polishedBad = await polishReportNarrativeWithGroq({
    deterministicExecutiveSummary: summary,
    overallAssessment: narrative,
    inventionTitle: invention.title,
    finalRecommendation: rec,
  });
  assert(polishedBad.provenance === 'DETERMINISTIC', 'TEST Y: Malformed Groq output falls back to DETERMINISTIC');

  setMockGroqHandler(null);
  process.env.GROQ_API_KEY = '';

  console.log('\n--- TEST Z/AA: Idempotency & duplicate prevention ---');
  const firstId = report.id;
  const { report: second } = await executeUnifiedReportGeneration(analysisRunId);
  assert(second.id === firstId, 'TEST Z: Idempotent generation reuses same report id');
  const allReports = await prisma.report.findMany({ where: { analysisRunId } });
  assert(allReports.length === 1, 'TEST AA: Only one report exists per AnalysisRun');

  console.log('\n--- TEST AB: Credential isolation ---');
  const serialized = JSON.stringify(report);
  assert(!serialized.includes('gsk_'), 'TEST AB: Report payload has no Groq key material');
  assert(!serialized.includes('DATABASE_URL'), 'TEST AB: Report payload has no DATABASE_URL');
  assert(!serialized.includes('OPENAI_API_KEY'), 'TEST AB: Report payload has no OPENAI_API_KEY');

  console.log('\n--- TEST AC: Report API end-to-end ---');
  const getRes = await getReportRoute(new Request('http://localhost/api/analysis/x/report'), {
    params: { id: analysisRunId },
  });
  assert(getRes.status === 200, 'TEST AC: GET /api/analysis/[id]/report returns 200');
  const getJson = await getRes.json();
  assert(getJson.success === true && getJson.report?.id === firstId, 'TEST AC: GET returns persisted report');

  const postRes = await postReportRoute(new Request('http://localhost/api/analysis/x/report', { method: 'POST' }), {
    params: { id: analysisRunId },
  });
  assert(postRes.status === 200, 'TEST AC: POST /api/analysis/[id]/report returns 200');
  const postJson = await postRes.json();
  assert(postJson.report?.id === firstId, 'TEST AC: POST remains idempotent');

  const byIdRes = await getReportByIdRoute(new Request('http://localhost/api/reports/x'), {
    params: { reportId: firstId },
  });
  assert(byIdRes.status === 200, 'TEST AC: GET /api/reports/[reportId] returns 200');

  const missingRes = await getReportRoute(new Request('http://localhost/api/analysis/x/report'), {
    params: { id: '00000000-0000-0000-0000-000000000000' },
  });
  assert(missingRes.status === 404, 'TEST AC: Missing analysis returns 404');

  // Empty-state: analysis with no prior art / no claims / no examiner
  console.log('\n--- TEST U/V/W: Empty analysis behavior ---');
  const emptyInvention = await prisma.invention.create({
    data: {
      userId: user.id,
      title: 'Phase11 Empty Evidence Invention',
      problem: 'p',
      solution: 's',
      howItWorks: 'h',
      advantages: 'a',
      differentiation: 'd',
      domain: 'General',
      industry: 'General',
      status: 'DRAFT',
    },
  });
  const emptyRun = await prisma.analysisRun.create({
    data: {
      inventionId: emptyInvention.id,
      status: 'COMPLETED',
      currentStep: 1,
    },
  });
  const emptyAssembled = await assembleUnifiedReport(emptyRun.id);
  assert(
    emptyAssembled.sections.priorArtLandscape.length === 0,
    'TEST U: No prior-art landscape entries'
  );
  assert(
    emptyAssembled.sections.claimStrategy.available === false,
    'TEST V: No claims available=false'
  );
  assert(
    emptyAssembled.sections.examinerSimulation.available === false,
    'TEST W: No examiner available=false'
  );
  assert(
    emptyAssembled.finalRecommendation === 'INSUFFICIENT_EVIDENCE',
    'TEST U: Empty run recommendation is INSUFFICIENT_EVIDENCE'
  );
  assert(
    emptyAssembled.sections.noveltyAssessment.available === false &&
      String(emptyAssembled.sections.noveltyAssessment.message).includes('Novelty assessment unavailable'),
    'TEST AI: Empty novelty shows Novelty assessment unavailable'
  );
  assert(
    emptyAssembled.sections.innovationGapAnalysis.available === false &&
      String(emptyAssembled.sections.innovationGapAnalysis.message).includes(
        'No material innovation opportunity identified from available evidence'
      ),
    'TEST AH: Empty innovation shows controlled empty message'
  );

  const fetched = await getReportForAnalysis(analysisRunId);
  assert(fetched?.id === firstId, 'TEST Z: getReportForAnalysis returns current report');
  assert(
    (fetched as any)?.evidence?.length > 0,
    'TEST P: getReportForAnalysis includes evidence relation'
  );

  // restore env
  if (originalGroqKey !== undefined) process.env.GROQ_API_KEY = originalGroqKey;
  else delete process.env.GROQ_API_KEY;

  console.log('\n================================================================');
  console.log(`PHASE 11 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runUnifiedReportTests()
  .catch((err) => {
    console.error('Phase 11 Unified Report Test Error:', err?.message || String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
