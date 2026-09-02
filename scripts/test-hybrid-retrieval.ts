import { prisma } from '../lib/prisma';
import {
  retrieveLexicalCandidates,
  retrieveSemanticCandidates,
  reciprocalRankFusion,
  executeHybridPriorArtRetrieval,
  type LexicalCandidate,
  type SemanticCandidate,
} from '../lib/retrieval/hybrid';
import { getInventionEmbeddingText } from '../lib/embedding/normalization';
import { getEmbeddingProvider } from '../lib/embedding/service';

async function testHybridRetrieval() {
  console.log('================================================================');
  console.log('⚡ TESTING PHASE 4: HYBRID PRIOR-ART RETRIEVAL & RRF ENGINE');
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
  // 1. TEST LEXICAL RETRIEVAL
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing PostgreSQL Lexical Retrieval ---');
  const lexicalQuery = 'aerial crop disease multi-spectral detection drone';
  const lexicalResults = await retrieveLexicalCandidates(lexicalQuery, 'Agriculture Technology', 10);

  assert(
    lexicalResults.length > 0,
    `Lexical retrieval returned candidates (Count: ${lexicalResults.length})`
  );
  assert(
    lexicalResults[0].lexicalRank === 1,
    'Top candidate has 1-indexed lexicalRank = 1'
  );
  const agriMatches = lexicalResults.filter(
    (d) => d.publicationNumber === 'DEMO-US-000001' || d.publicationNumber === 'DEMO-US-000032'
  );
  assert(
    agriMatches.length > 0,
    `Lexical search successfully matches agricultural patents (Found: ${agriMatches.map((m) => m.publicationNumber).join(', ')})`
  );

  // -------------------------------------------------------------------------
  // 2. TEST SEMANTIC RETRIEVAL
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing pgvector Semantic Cosine Retrieval ---');
  const embeddingProvider = getEmbeddingProvider();
  const sampleEmbeddingText = getInventionEmbeddingText({
    title: 'Multi-Spectral Aerial Crop Disease Detection',
    problem: 'Fungal leaf blight undetected in early stages spreads across crop fields.',
    solution: 'Drone with multispectral camera analyzing vegetative health indices in real time.',
    howItWorks: 'Autonomous flight paths capture multispectral imagery evaluated with edge neural networks.',
    differentiation: 'Sub-millimeter resolution with localized micro-nozzle fungicide spraying.',
  });
  const embResult = await embeddingProvider.embedText(sampleEmbeddingText);
  const vectorStr = `[${embResult.vector.join(',')}]`;

  const semanticResults = await retrieveSemanticCandidates(vectorStr, 10);
  assert(
    semanticResults.length > 0,
    `Semantic retrieval returned candidates (Count: ${semanticResults.length})`
  );
  assert(
    semanticResults[0].semanticRank === 1,
    'Top candidate has 1-indexed semanticRank = 1'
  );
  assert(
    semanticResults[0].distance <= semanticResults[semanticResults.length - 1].distance,
    `Semantic results are sorted by cosine distance ascending (Top: ${semanticResults[0].distance.toFixed(4)} <= Last: ${semanticResults[semanticResults.length - 1].distance.toFixed(4)})`
  );

  // -------------------------------------------------------------------------
  // 3. TEST RECIPROCAL RANK FUSION (RRF) ALGORITHM
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Reciprocal Rank Fusion Mathematical Properties ---');
  const dummyLexical: LexicalCandidate[] = [
    {
      id: 'doc-1',
      publicationNumber: 'DEMO-US-000001',
      title: 'Patent 1',
      abstract: 'Abstract 1',
      source: 'DEMO',
      jurisdiction: 'US',
      publicationDate: null,
      metadata: {},
      lexicalScore: 0.9,
      lexicalRank: 1, // rank 1 in lexical
    },
    {
      id: 'doc-2',
      publicationNumber: 'DEMO-US-000002',
      title: 'Patent 2',
      abstract: 'Abstract 2',
      source: 'DEMO',
      jurisdiction: 'US',
      publicationDate: null,
      metadata: {},
      lexicalScore: 0.5,
      lexicalRank: 2, // rank 2 in lexical
    },
  ];

  const dummySemantic: SemanticCandidate[] = [
    {
      id: 'doc-1',
      publicationNumber: 'DEMO-US-000001',
      title: 'Patent 1',
      abstract: 'Abstract 1',
      source: 'DEMO',
      jurisdiction: 'US',
      publicationDate: null,
      metadata: {},
      distance: 0.1,
      semanticRank: 1, // rank 1 in semantic
    },
    {
      id: 'doc-3',
      publicationNumber: 'DEMO-US-000003',
      title: 'Patent 3',
      abstract: 'Abstract 3',
      source: 'DEMO',
      jurisdiction: 'US',
      publicationDate: null,
      metadata: {},
      distance: 0.2,
      semanticRank: 2, // rank 2 in semantic
    },
  ];

  // For doc-1 (rank 1 in both): RRF = 1/(60+1) + 1/(60+1) = 2/61 ≈ 0.03278
  // For doc-2 (rank 2 in lexical only): RRF = 1/(60+2) = 1/62 ≈ 0.01612
  // For doc-3 (rank 2 in semantic only): RRF = 1/(60+2) = 1/62 ≈ 0.01612
  const fusedTest = reciprocalRankFusion(dummyLexical, dummySemantic, 60, 5);

  assert(
    fusedTest[0].publicationNumber === 'DEMO-US-000001',
    'Document appearing top in both streams achieves highest RRF score'
  );
  assert(
    fusedTest[0].rrfScore > fusedTest[1].rrfScore,
    `Dual-stream match score (${fusedTest[0].rrfScore.toFixed(5)}) > Single-stream score (${fusedTest[1].rrfScore.toFixed(5)})`
  );
  assert(
    fusedTest[0].similarity > fusedTest[1].similarity,
    `Calibrated similarity preserves RRF ranking (${fusedTest[0].similarity}% > ${fusedTest[1].similarity}%)`
  );

  // -------------------------------------------------------------------------
  // 4. TEST END-TO-END HYBRID RETRIEVAL (MULTIPLE DOMAINS)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing End-to-End Hybrid Retrieval on Diverse Inventions ---');

  // Case A: Cybersecurity invention
  const cyberQuery = 'post-quantum lattice key exchange hardware acceleration';
  const cyberEmb = await embeddingProvider.embedText(cyberQuery);
  const cyberResults = await executeHybridPriorArtRetrieval({
    query: cyberQuery,
    domain: 'Cybersecurity',
    embeddingVector: `[${cyberEmb.vector.join(',')}]`,
    limit: 5,
  });

  assert(
    cyberResults.length === 5,
    `Cybersecurity hybrid retrieval returned 5 fused results (Count: ${cyberResults.length})`
  );
  const topCyberId = cyberResults[0].publicationNumber;
  assert(
    topCyberId === 'DEMO-US-000012' || topCyberId === 'DEMO-US-000013',
    `Top result is cybersecurity patent DEMO-US-000012 or DEMO-US-000013 (Found: ${topCyberId})`
  );

  // Case B: Energy & Battery invention
  const energyQuery = 'solid-state lithium battery nanostructured ceramic electrolyte';
  const energyEmb = await embeddingProvider.embedText(energyQuery);
  const energyResults = await executeHybridPriorArtRetrieval({
    query: energyQuery,
    domain: 'Energy & CleanTech',
    embeddingVector: `[${energyEmb.vector.join(',')}]`,
    limit: 5,
  });

  const topEnergyId = energyResults[0].publicationNumber;
  assert(
    topEnergyId === 'DEMO-US-000016' || topEnergyId === 'DEMO-US-000017',
    `Top result is energy/battery patent DEMO-US-000016 or DEMO-US-000017 (Found: ${topEnergyId})`
  );

  console.log('\n================================================================');
  console.log(`HYBRID RETRIEVAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testHybridRetrieval()
  .catch((err) => {
    console.error('Hybrid Retrieval Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
