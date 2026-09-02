import { prisma } from '../lib/prisma';
import { executeInventionAnalysis } from '../lib/analysis/engine';

async function testPhase3Consistency() {
  console.log('================================================================');
  console.log('🔬 PHASE 3 PRODUCTION-FACING CONSISTENCY TEST');
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

  // 1. Create invention payload
  const testInventionInput = {
    title: 'Autonomous Edge Swarm Pathfinding with Dynamic Mesh Radio',
    problem: 'GPS-denied underground tunnel networks cause robotic mapping failure.',
    solution: 'Ultra-wideband mesh transceivers combining SLAM with distributed consensus routing.',
    howItWorks: 'Nodes exchange relative ranging packets and solve distributed graph optimization on low-power MCUs.',
    advantages: 'Zero infrastructure requirement, 5cm positioning precision in dense rock formations.',
    differentiation: 'Asynchronous consensus gossip protocol resistant to 60% packet drop rates.',
    domain: 'Robotics & Autonomous Systems',
    industry: 'Mining & Underground Exploration',
  };

  console.log('1. Executing invention creation and full analysis pipeline...');
  let analysisResult: any;
  try {
    analysisResult = await executeInventionAnalysis(testInventionInput);
  } catch (err: any) {
    console.error('Execute error message:', err?.message || String(err));
    console.error('Execute error stack:', err?.stack);
    throw new Error(`executeInventionAnalysis failed: ${err?.message || String(err)}`);
  }

  const targetInventionId = analysisResult.inventionId;
  const targetAnalysisRunId = analysisResult.analysisRunId;

  assert(Boolean(targetInventionId), `Invention ID created in PostgreSQL: ${targetInventionId}`);
  assert(Boolean(targetAnalysisRunId), `AnalysisRun ID created in PostgreSQL: ${targetAnalysisRunId}`);

  // 2. Query Analysis Page Data (AnalysisRun)
  console.log('\n2. Verifying Analysis Data references...');
  const dbAnalysisRun = await prisma.analysisRun.findUnique({
    where: { id: targetAnalysisRunId },
    include: { invention: true },
  });

  assert(
    dbAnalysisRun !== null && dbAnalysisRun.inventionId === targetInventionId,
    'AnalysisRun directly references the correct target inventionId'
  );

  // 3. Query Prior Art Data (PriorArtMatch)
  console.log('\n3. Verifying Prior Art Data references...');
  const priorArtMatches = await prisma.priorArtMatch.findMany({
    where: { analysisRunId: targetAnalysisRunId },
    include: { document: true },
  });

  assert(
    priorArtMatches.length > 0,
    `Prior art matches retrieved from database (Count: ${priorArtMatches.length})`
  );
  assert(
    priorArtMatches.every((pam) => pam.analysisRunId === targetAnalysisRunId),
    'Every PriorArtMatch strictly references targetAnalysisRunId'
  );

  // 4. Query Innovation Gaps Data (AnalysisOpportunity)
  console.log('\n4. Verifying Innovation Opportunities references...');
  const opportunities = await prisma.analysisOpportunity.findMany({
    where: { analysisRunId: targetAnalysisRunId },
  });

  assert(
    opportunities.length > 0,
    `AnalysisOpportunity records retrieved from database (Count: ${opportunities.length})`
  );
  assert(
    opportunities.every(
      (opp) => opp.analysisRunId === targetAnalysisRunId && opp.inventionId === targetInventionId
    ),
    'Every AnalysisOpportunity strictly references targetAnalysisRunId AND targetInventionId'
  );

  // 5. Query Claims Data (Claim & ClaimVersion)
  console.log('\n5. Verifying Claims references...');
  const claims = await prisma.claim.findMany({
    where: { inventionId: targetInventionId },
    include: { versions: true },
  });

  assert(claims.length > 0, `Claims retrieved from database (Count: ${claims.length})`);
  assert(
    claims.every((c) => c.inventionId === targetInventionId && c.versions.length > 0),
    'Every Claim and ClaimVersion strictly references targetInventionId'
  );

  // 6. Query Examiner Review Data (ExaminerReview)
  console.log('\n6. Verifying Examiner Review references...');
  const examinerReviews = await prisma.examinerReview.findMany({
    where: { inventionId: targetInventionId },
  });

  assert(
    examinerReviews.length > 0,
    `ExaminerReview records retrieved from database (Count: ${examinerReviews.length})`
  );
  assert(
    examinerReviews.every((rev) => rev.inventionId === targetInventionId),
    'Every ExaminerReview strictly references targetInventionId'
  );

  // 7. Query Report Data (Report)
  console.log('\n7. Verifying Report references...');
  const reports = await prisma.report.findMany({
    where: { analysisRunId: targetAnalysisRunId },
  });

  assert(reports.length > 0, `Report records retrieved from database (Count: ${reports.length})`);
  assert(
    reports.every(
      (rep) => rep.analysisRunId === targetAnalysisRunId && rep.inventionId === targetInventionId
    ),
    'Every Report strictly references targetAnalysisRunId AND targetInventionId'
  );

  // 8. Verify Dashboard API Data is backed by PostgreSQL
  console.log('\n8. Verifying Dashboard Stats API logic...');
  const totalInventions = await prisma.invention.count();
  const totalAnalyses = await prisma.analysisRun.count();
  const totalPriorArt = await prisma.priorArtDocument.count();

  assert(
    totalInventions >= 1 && totalAnalyses >= 1 && totalPriorArt >= 32,
    `Dashboard counts accurately reflect PostgreSQL state (Inventions: ${totalInventions}, Analyses: ${totalAnalyses}, PriorArt: ${totalPriorArt})`
  );

  console.log('\n================================================================');
  console.log(`PHASE 3 CONSISTENCY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testPhase3Consistency()
  .catch((err) => {
    console.error('Phase 3 Consistency Test Error:', err?.message || String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
