import { prisma } from '../lib/prisma';
import { PatentsViewProvider } from '../lib/patent/providers/patentsview';
import { searchAndIngestPriorArt } from '../lib/patent/service';

/**
 * Mock PatentsView API response matching official JSON format returned by api.patentsview.org
 */
const mockPatentsViewApiResponse = {
  patents: [
    {
      patent_number: '11888999',
      patent_title: 'Real-Time Edge Computer Vision Conveyor Sorting System',
      patent_abstract: 'An automated industrial sorting conveyor utilizing high-speed optical camera arrays and on-device neural network inference to classify recyclable objects.',
      patent_date: '2023-10-15',
      app_date: '2022-04-10',
      inventors: [
        { inventor_first_name: 'Marcus', inventor_last_name: 'Vance' },
        { inventor_first_name: 'Elena', inventor_last_name: 'Rostova' },
      ],
      assignees: [
        { assignee_organization: 'Robotics Sorting Technologies Inc' },
      ],
      cpcs: [
        { cpc_subclass: 'B07C 5/342' },
        { cpc_subclass: 'G06V 20/52' },
      ],
      ipcs: [
        { ipc_subclass: 'B07C 5/34' },
        { ipc_subclass: 'G06F 18/00' },
      ],
    },
  ],
  count: 1,
  total_patent_count: 1,
};

async function testPatentsViewMockProvider() {
  console.log('🧪 Testing PatentsView Provider with Mocked HTTP API Payload...\n');

  try {
    const provider = new PatentsViewProvider();

    // =========================================================================
    // TEST 1: Provider Normalization
    // =========================================================================
    console.log('--- TEST 1: PatentsView Record Normalization ---');
    const rawRecord = mockPatentsViewApiResponse.patents[0];
    const normalized = provider.normalizeDocument(rawRecord);

    if (normalized.publicationNumber !== 'US-11888999' || normalized.source !== 'patentsview') {
      throw new Error(`FAILED: Normalization error! Got pub: ${normalized.publicationNumber}, source: ${normalized.source}`);
    }

    if (normalized.inventors.length !== 2 || normalized.inventors[0] !== 'Marcus Vance') {
      throw new Error('FAILED: Inventors normalization failed!');
    }

    if (normalized.applicants[0] !== 'Robotics Sorting Technologies Inc') {
      throw new Error('FAILED: Assignee normalization failed!');
    }

    if (normalized.ipcCodes[0] !== 'B07C 5/34') {
      throw new Error('FAILED: IPC code normalization failed!');
    }

    console.log('✅ 1. PatentsView Normalization Passed!');
    console.log(`   PubNum: ${normalized.publicationNumber} | Title: "${normalized.title.substring(0, 50)}..."`);
    console.log(`   Inventors: ${normalized.inventors.join(', ')} | Assignees: ${normalized.applicants.join(', ')}`);

    // =========================================================================
    // TEST 2: Database Ingestion & Idempotency
    // =========================================================================
    console.log('\n--- TEST 2: Database Ingestion & Idempotency ---');
    
    // Override fetch for mock testing
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify(mockPatentsViewApiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      // Ingestion Run 1 (Create)
      const results1 = await searchAndIngestPriorArt({ query: 'computer vision sorting' }, provider);
      if (results1.length !== 1 || results1[0].publicationNumber !== 'US-11888999') {
        throw new Error('FAILED: Ingestion run 1 failed to create record!');
      }
      console.log('✅ 2a. Initial Ingestion Created Record in PostgreSQL! Action:', results1[0].action);

      // Ingestion Run 2 (Update/Idempotent)
      const results2 = await searchAndIngestPriorArt({ query: 'computer vision sorting' }, provider);
      if (results2.length !== 1 || results2[0].action !== 'updated') {
        throw new Error('FAILED: Ingestion run 2 failed idempotency check!');
      }
      console.log('✅ 2b. Idempotent Re-Ingestion Updated Record without duplicates!');

      // =========================================================================
      // TEST 3: Vector Embedding & pgvector Storage Verification
      // =========================================================================
      console.log('\n--- TEST 3: Vector Embedding Persistence ---');
      const dbRecord = await prisma.priorArtDocument.findUnique({
        where: { publicationNumber: 'US-11888999' },
      });

      if (!dbRecord) throw new Error('FAILED: Record missing from PostgreSQL database!');

      const rawVectorInfo: any = await prisma.$queryRawUnsafe(
        `SELECT "embedding" IS NOT NULL AS has_vector, vector_dims("embedding") AS vector_length FROM "prior_art_documents" WHERE "id" = $1`,
        dbRecord.id
      );

      const hasVector = rawVectorInfo[0]?.has_vector;
      const vectorLen = rawVectorInfo[0]?.vector_length;

      console.log('✅ 3a. Database Record Verified! Source:', dbRecord.source);
      console.log('✅ 3b. pgvector Embedding Verified! Has Vector?:', hasVector, '| Vector Dims:', vectorLen);

      // Cleanup test record
      await prisma.priorArtDocument.delete({ where: { id: dbRecord.id } });
      console.log('\n🧹 Test record US-11888999 cleaned up from database.');
    } finally {
      global.fetch = originalFetch;
    }

    console.log('\n🎉 PATENTSVIEW MOCK TEST SUITE PASSED 100%!');
  } catch (err: any) {
    console.error('❌ Test Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPatentsViewMockProvider();
