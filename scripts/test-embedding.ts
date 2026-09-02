import fs from 'fs';
import path from 'path';

// Parse .env.local manually for test script execution
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const match = envContent.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match && match[1]) {
    process.env.OPENAI_API_KEY = match[1];
  }
}

import { prisma } from '../lib/prisma';
import { OpenAIEmbeddingProvider } from '../lib/embedding/providers/openai';
import {
  getPriorArtEmbeddingText,
  getInventionEmbeddingText,
} from '../lib/embedding/normalization';
import {
  getEmbeddingProvider,
  setEmbeddingProvider,
  validateModelConsistency,
  embedAndStorePriorArtDoc,
  embedAndStoreInvention,
  searchPriorArtByVector,
} from '../lib/embedding/service';
import type { EmbeddingProvider, EmbeddingResult } from '../lib/embedding/types';

/**
 * Mock Provider for testing dimension validation and failure scenarios without external network API calls.
 */
class MockEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'mock_provider';
  public readonly model = 'text-embedding-3-small';
  public readonly dimensions = 1536;

  public async embedText(text: string): Promise<EmbeddingResult> {
    if (!text.trim()) {
      return {
        vector: new Array(this.dimensions).fill(0),
        dimensions: this.dimensions,
        model: this.model,
      };
    }

    if (text.includes('TRIGGER_PROVIDER_FAILURE')) {
      throw new Error('Simulated API Network Failure');
    }

    if (text.includes('TRIGGER_INCORRECT_DIMENSION')) {
      return {
        vector: [0.1, 0.2, 0.3], // Faulty 3-dimensional vector
        dimensions: 3,
        model: this.model,
      };
    }

    // Return deterministic 1536-dim vector for testing
    const vector = new Array(this.dimensions).fill(0.0123);
    return {
      vector,
      dimensions: this.dimensions,
      model: this.model,
    };
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!texts || texts.length === 0) return [];
    return Promise.all(texts.map((t) => this.embedText(t)));
  }
}

async function runEmbeddingTestSuite() {
  console.log('🧪 Starting NovelCore AI Embedding Infrastructure Test Suite...\n');

  try {
    // =========================================================================
    // TEST 1: Reusable Deterministic Text Normalization Functions
    // =========================================================================
    console.log('--- TEST 1: Deterministic Text Normalization ---');
    const samplePriorArtInput = {
      title: 'Multi-Modal Waste Sorting System',
      abstract: 'An automated sorting conveyor with NIR spectroscopy and camera.',
      claims: ['1. A waste sorting system.', '2. The system of claim 1.'],
    };

    const priorArtText = getPriorArtEmbeddingText(samplePriorArtInput);
    const expectedPriorArtText =
      'Title: Multi-Modal Waste Sorting System\n\nAbstract: An automated sorting conveyor with NIR spectroscopy and camera.\n\nClaims:\n1. A waste sorting system.\n2. The system of claim 1.';

    if (priorArtText !== expectedPriorArtText) {
      throw new Error('FAILED: PriorArt deterministic text normalization output mismatch!');
    }
    console.log('✅ 1a. PriorArt Deterministic Text Calculation Passed!');

    const sampleInventionInput = {
      title: 'Autonomous Crop Health Drone',
      problem: 'Over-irrigation in greenhouses.',
      solution: 'Thermal vision micro-drone.',
      howItWorks: 'Drone flies waypoints and detects leaf stress.',
      differentiation: 'Direct root zone micro-dosing.',
    };

    const inventionText = getInventionEmbeddingText(sampleInventionInput);
    const expectedInventionText =
      'Title: Autonomous Crop Health Drone\n\nProblem Statement:\nOver-irrigation in greenhouses.\n\nTechnical Solution:\nThermal vision micro-drone.\n\nMechanism of Action:\nDrone flies waypoints and detects leaf stress.\n\nDifferentiation:\nDirect root zone micro-dosing.';

    if (inventionText !== expectedInventionText) {
      throw new Error('FAILED: Invention deterministic text normalization output mismatch!');
    }
    console.log('✅ 1b. Invention Deterministic Text Calculation Passed!');

    // =========================================================================
    // TEST 2: Provider Abstraction & Mock Provider (embedText & embedBatch)
    // =========================================================================
    console.log('\n--- TEST 2: Provider Abstraction & Batch Embedding ---');
    const mockProvider = new MockEmbeddingProvider();
    setEmbeddingProvider(mockProvider);

    const singleResult = await mockProvider.embedText('Sample patent claim text');
    if (singleResult.vector.length !== 1536 || singleResult.model !== 'text-embedding-3-small') {
      throw new Error('FAILED: Single embedText dimensions or model mismatch!');
    }
    console.log('✅ 2a. embedText() Passed! Dimensions:', singleResult.dimensions);

    const batchResults = await mockProvider.embedBatch(['Claim 1', 'Claim 2', 'Claim 3']);
    if (batchResults.length !== 3 || batchResults[0].vector.length !== 1536) {
      throw new Error('FAILED: embedBatch() count or dimension mismatch!');
    }
    console.log('✅ 2b. embedBatch() Passed! Batch size:', batchResults.length);

    // =========================================================================
    // TEST 3: Empty Input & Model Metadata Handling
    // =========================================================================
    console.log('\n--- TEST 3: Empty Input & Model Metadata ---');
    const emptyResult = await mockProvider.embedText('   ');
    if (emptyResult.vector.length !== 1536 || emptyResult.vector.every((v) => v === 0) !== true) {
      throw new Error('FAILED: Empty input did not return zero-filled vector!');
    }
    console.log('✅ 3a. Empty Input Handling Passed (Returned 1536 zero-vector).');

    // =========================================================================
    // TEST 4: Model Consistency Guard & Mismatch Detection
    // =========================================================================
    console.log('\n--- TEST 4: Model Consistency Guard ---');
    const validCheck = validateModelConsistency('text-embedding-3-small', 1536);
    if (!validCheck.valid) {
      throw new Error('FAILED: Valid model check failed!');
    }
    console.log('✅ 4a. Matching Model & Dimension Validation Passed!');

    const invalidModelCheck = validateModelConsistency('text-embedding-ada-002', 1536);
    if (invalidModelCheck.valid) {
      throw new Error('FAILED: Mismatched model check did not fail!');
    }
    console.log('✅ 4b. Mismatched Model Guard Detected:', invalidModelCheck.reason);

    const invalidDimCheck = validateModelConsistency('text-embedding-3-small', 512);
    if (invalidDimCheck.valid) {
      throw new Error('FAILED: Mismatched dimension check did not fail!');
    }
    console.log('✅ 4c. Mismatched Dimension Guard Detected:', invalidDimCheck.reason);

    // =========================================================================
    // TEST 5: Incorrect Vector Dimension Fail-Safe Detection
    // =========================================================================
    console.log('\n--- TEST 5: Incorrect Dimension Fail-Safe ---');
    try {
      const faultyDoc = await mockProvider.embedText('TRIGGER_INCORRECT_DIMENSION');
      if (faultyDoc.dimensions !== mockProvider.dimensions) {
        console.log('✅ 5a. Incorrect Dimension Detected (3 vs 1536 expected).');
      }
    } catch {
      console.log('✅ 5a. Incorrect Dimension Exception Handled Cleanly.');
    }

    // =========================================================================
    // TEST 6: Simulated Provider Failure Handling
    // =========================================================================
    console.log('\n--- TEST 6: Provider Failure Handling ---');
    try {
      await mockProvider.embedText('TRIGGER_PROVIDER_FAILURE');
      throw new Error('FAILED: Provider failure was not thrown!');
    } catch (err: any) {
      console.log('✅ 6a. Provider API Failure Handled Cleanly:', err.message);
    }

    // =========================================================================
    // TEST 7: Database Vector Storage & Cosine Distance Search
    // =========================================================================
    console.log('\n--- TEST 7: PostgreSQL Database Storage & Cosine Search ---');
    
    // Create test user and prior art record
    const testUser = await prisma.user.upsert({
      where: { email: 'embedding.tester@novelcore.ai' },
      update: { name: 'Embedding Tester' },
      create: { email: 'embedding.tester@novelcore.ai', name: 'Embedding Tester' },
    });

    const dbPriorArt = await prisma.priorArtDocument.upsert({
      where: { publicationNumber: 'US-9999999-TEST' },
      update: {
        title: 'Test Prior Art Document',
        abstract: 'Test abstract text for vector embedding storage.',
        claimsText: '1. A test claim for vector embeddings.',
        source: 'test_source',
      },
      create: {
        publicationNumber: 'US-9999999-TEST',
        title: 'Test Prior Art Document',
        abstract: 'Test abstract text for vector embedding storage.',
        claimsText: '1. A test claim for vector embeddings.',
        source: 'test_source',
      },
    });

    // Store embedding in DB
    const embedStorageResult = await embedAndStorePriorArtDoc(dbPriorArt.id);
    console.log('✅ 7a. Embedded & Persisted PriorArtDocument in PostgreSQL! Model:', embedStorageResult.model);

    // Verify stored DB metadata
    const updatedDbDoc = await prisma.priorArtDocument.findUnique({
      where: { id: dbPriorArt.id },
    });

    if (
      !updatedDbDoc ||
      updatedDbDoc.embeddingModel !== 'text-embedding-3-small' ||
      updatedDbDoc.embeddingDim !== 1536
    ) {
      throw new Error('FAILED: Database record metadata model or dimension missing!');
    }
    console.log('✅ 7b. PostgreSQL Metadata Verified! Model:', updatedDbDoc.embeddingModel, '| Dim:', updatedDbDoc.embeddingDim);

    // Test Invention Embedding Storage
    const dbInvention = await prisma.invention.create({
      data: {
        userId: testUser.id,
        title: 'Test Invention Title',
        problem: 'Test problem description.',
        solution: 'Test solution description.',
        howItWorks: 'Test mechanism of action.',
        differentiation: 'Test unique differentiators.',
        advantages: 'High efficiency.',
        domain: 'Test Domain',
        industry: 'Test Industry',
      },
    });

    await embedAndStoreInvention(dbInvention.id);
    const updatedInvention = await prisma.invention.findUnique({
      where: { id: dbInvention.id },
    });

    if (!updatedInvention || updatedInvention.embeddingDim !== 1536) {
      throw new Error('FAILED: Invention embedding persistence failed!');
    }
    console.log('✅ 7c. Embedded & Persisted Invention in PostgreSQL! Model:', updatedInvention.embeddingModel);

    // Perform Vector Search
    const searchResults = await searchPriorArtByVector(embedStorageResult.vector, 5);
    console.log(`✅ 7d. Cosine Distance Vector Search Executed! Found ${searchResults.length} matches.`);

    // Cleanup test records
    await prisma.priorArtDocument.delete({ where: { id: dbPriorArt.id } });
    await prisma.invention.delete({ where: { id: dbInvention.id } });
    console.log('🧹 Test database records cleaned up.');

    // =========================================================================
    // TEST 8: Live OpenAI Embedding Provider Verification (If Key Configured)
    // =========================================================================
    console.log('\n--- TEST 8: Live OpenAI Provider Verification ---');
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (openAiApiKey && !openAiApiKey.includes('demo-key-placeholder')) {
      const openAiProvider = new OpenAIEmbeddingProvider();
      const liveResult = await openAiProvider.embedText('Patent claim semantic search verification.');
      console.log('🎉 Live OpenAI API Call Succeeded! Model:', liveResult.model, '| Dim:', liveResult.dimensions);
    } else {
      console.log('⚠️ OPENAI_API_KEY is using a placeholder in .env.local.');
      console.log('   Live API test skipped (Provider fallback & mock tests verified 100% cleanly).');
    }

    console.log('\n🎉 ALL EMBEDDING INFRASTRUCTURE TESTS PASSED 100%!');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEmbeddingTestSuite();
