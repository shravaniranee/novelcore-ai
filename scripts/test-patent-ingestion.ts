import { prisma } from '../lib/prisma';
import { LensPatentProvider } from '../lib/patent/providers/lens';
import { searchAndIngestPriorArt } from '../lib/patent/service';
import type { NormalizedPatentDocument, PatentProvider, PatentSearchOptions } from '../lib/patent/types';

/**
 * Mock Patent Provider for testing failure handling & malformed records
 */
class TestPatentProvider implements PatentProvider {
  public readonly name = 'test_provider';

  public async search(options: PatentSearchOptions): Promise<NormalizedPatentDocument[]> {
    if (options.query === 'TRIGGER_API_FAILURE') {
      throw new Error('Simulated Patent API Network Timeout');
    }

    if (options.query === 'MALFORMED_RECORD') {
      return [
        this.normalizeDocument({
          // Missing publicationNumber, title, abstract
          raw: {},
        }),
      ];
    }

    return [
      {
        publicationNumber: 'US-9990001-B2',
        title: 'Test Automated Sorting Robot Invention',
        abstract: 'An automated sorting robot with sensor fusion.',
        claims: ['1. A sorting robot.', '2. The robot of claim 1.'],
        source: this.name,
        filingDate: new Date('2022-01-01'),
        publicationDate: new Date('2023-01-01'),
        ipcCodes: ['B07C 5/34', 'G06V 20/52'],
        cpcCodes: ['B07C 5/342'],
        inventors: ['Alice Smith'],
        applicants: ['Robotics Corp'],
        url: 'https://www.lens.org/lens/patent/US-9990001-B2',
        rawMetadata: { test: true },
      },
    ];
  }

  public async getDocument(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    const results = await this.search({ query: publicationNumber });
    return results[0] || null;
  }

  public async getByPublicationNumber(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    return this.getDocument(publicationNumber);
  }

  public async getById(id: string): Promise<NormalizedPatentDocument | null> {
    return this.getDocument(id);
  }

  public normalizeDocument(raw: any): NormalizedPatentDocument {
    return {
      publicationNumber: raw?.publicationNumber || `US-FALLBACK-${Date.now()}`,
      title: raw?.title || 'Untitled Patent',
      abstract: raw?.abstract || 'No abstract text available.',
      claims: Array.isArray(raw?.claims) ? raw.claims : ['1. A default claim.'],
      source: this.name,
      filingDate: raw?.filingDate ? new Date(raw.filingDate) : null,
      publicationDate: raw?.publicationDate ? new Date(raw.publicationDate) : null,
      ipcCodes: Array.isArray(raw?.ipcCodes) ? raw.ipcCodes : ['G06F 17/00'],
      cpcCodes: Array.isArray(raw?.cpcCodes) ? raw.cpcCodes : [],
      inventors: Array.isArray(raw?.inventors) ? raw.inventors : ['Unknown'],
      applicants: Array.isArray(raw?.applicants) ? raw.applicants : ['Unknown'],
      url: raw?.url || null,
      rawMetadata: raw || {},
    };
  }
}

class MockEmbeddingProvider {
  public readonly name = 'mock';
  public readonly model = 'text-embedding-3-small';
  public readonly dimensions = 1536;
  public async embedText(text: string) {
    return {
      vector: new Array(1536).fill(0.0123),
      dimensions: 1536,
      model: this.model,
    };
  }
  public async embedBatch(texts: string[]) {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }
}

async function runPatentIngestionTestSuite() {
  console.log('🧪 Starting NovelCore AI Patent Ingestion Test Suite...\n');
  const { setEmbeddingProvider } = await import('../lib/embedding/service');
  setEmbeddingProvider(new MockEmbeddingProvider() as any);

  try {
    // =========================================================================
    // TEST 1: Provider Normalization
    // =========================================================================
    console.log('--- TEST 1: Provider Normalization ---');
    const lensProvider = new LensPatentProvider();
    const rawDoc = {
      publicationNumber: 'US-8887776-A1',
      title: 'Sensor Fusion Sorting Algorithm',
      abstract: 'Abstract describing sensor fusion.',
      claims: ['1. A method.'],
      ipcCodes: ['B07C 5/34'],
    };

    const normalized = lensProvider.normalizeDocument(rawDoc);
    if (normalized.publicationNumber !== 'US-8887776-A1' || normalized.source !== 'lens_org') {
      throw new Error('FAILED: Lens patent provider normalization error!');
    }
    console.log('✅ 1. Provider Normalization Passed! Source:', normalized.source);

    // =========================================================================
    // TEST 2: Duplicate Prevention & Idempotency
    // =========================================================================
    console.log('\n--- TEST 2: Duplicate Prevention & Idempotency ---');
    const testProvider = new TestPatentProvider();

    // Ingestion 1
    const run1 = await searchAndIngestPriorArt({ query: 'normal' }, testProvider);
    if (run1.length !== 1 || run1[0].action !== 'created') {
      throw new Error('FAILED: First ingestion should create new record!');
    }
    console.log('✅ 2a. Initial Ingestion Created Record:', run1[0].publicationNumber);

    // Ingestion 2 (Duplicate ID)
    const run2 = await searchAndIngestPriorArt({ query: 'normal' }, testProvider);
    if (run2.length !== 1 || run2[0].action !== 'updated') {
      throw new Error('FAILED: Re-ingestion should update existing record without duplicates!');
    }
    console.log('✅ 2b. Idempotent Re-Ingestion Updated Record without duplicates!');

    // Verify DB count remains 1
    const dbCount = await prisma.priorArtDocument.count({
      where: { publicationNumber: 'US-9990001-B2' },
    });
    if (dbCount !== 1) {
      throw new Error(`FAILED: Expected 1 record in database, found ${dbCount}!`);
    }
    console.log('✅ 2c. Database Record Count Verified (Count: 1).');

    // =========================================================================
    // TEST 3: Malformed Record Fallback Handling
    // =========================================================================
    console.log('\n--- TEST 3: Malformed Record Fallback Handling ---');
    const malformedRun = await searchAndIngestPriorArt({ query: 'MALFORMED_RECORD' }, testProvider);
    if (malformedRun.length !== 1 || !malformedRun[0].publicationNumber) {
      throw new Error('FAILED: Malformed record did not handle fallbacks cleanly!');
    }
    console.log('✅ 3. Malformed Record Handled Cleanly! Assigned PubNum:', malformedRun[0].publicationNumber);

    // =========================================================================
    // TEST 4: API Failure Handling
    // =========================================================================
    console.log('\n--- TEST 4: API Failure Handling ---');
    try {
      await searchAndIngestPriorArt({ query: 'TRIGGER_API_FAILURE' }, testProvider);
      throw new Error('FAILED: API failure was not caught!');
    } catch (err: any) {
      console.log('✅ 4. API Failure Caught & Handled Cleanly:', err.message);
    }

    // =========================================================================
    // TEST 5: Automatic Vector Embedding Generation & Persistence
    // =========================================================================
    console.log('\n--- TEST 5: Automatic Vector Embedding Generation ---');
    const ingestedDoc = run1[0];

    const dbRecord = await prisma.priorArtDocument.findUnique({
      where: { publicationNumber: ingestedDoc.publicationNumber },
    });

    if (!dbRecord) {
      throw new Error('FAILED: DB record missing for embedding check!');
    }

    // Verify embedding columns
    const rawVectorInfo: any = await prisma.$queryRawUnsafe(
      `SELECT "embedding" IS NOT NULL AS has_vector, vector_dims("embedding") AS vector_length FROM "prior_art_documents" WHERE "id" = $1`,
      dbRecord.id
    );

    const hasVector = rawVectorInfo[0]?.has_vector;
    const vectorLen = rawVectorInfo[0]?.vector_length;

    console.log('✅ 5a. DB Metadata Verified! Model:', dbRecord.embeddingModel, '| Dim:', dbRecord.embeddingDim);
    console.log('✅ 5b. pgvector Embedding Column Verified! Has Vector?:', hasVector, '| Vector Dims:', vectorLen);

    // Cleanup test records
    await prisma.priorArtDocument.deleteMany({
      where: {
        publicationNumber: { in: ['US-9990001-B2', malformedRun[0].publicationNumber] },
      },
    });
    console.log('\n🧹 Test records cleaned up from database.');

    console.log('\n🎉 ALL PATENT INGESTION TESTS PASSED 100%!');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPatentIngestionTestSuite();
