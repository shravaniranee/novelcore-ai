import { prisma } from '../lib/prisma';
import { LensPatentProvider } from '../lib/patent/providers/lens';
import { searchAndIngestPriorArt, getPriorArtByPublicationNumber } from '../lib/patent/service';
import type { PatentProvider } from '../lib/patent/types';

async function testPatentProviderArchitecture() {
  console.log('🧪 Testing NovelCore AI Patent-Data Provider Architecture...\n');

  try {
    // 1. Verify PatentProvider Interface Instantiation
    const provider: PatentProvider = new LensPatentProvider();
    console.log('✅ 1. Provider Instantiation Verified: Provider Name =', provider.name);

    // 2. Test Provider Search & Normalization
    console.log('\n2. Searching and Normalizing Patent Documents via Provider Interface...');
    const searchOptions = {
      keywords: ['multi-modal', 'sensor fusion', 'waste segregation'],
      ipcCodes: ['B07C 5/34', 'G06V 20/52'],
      limit: 5,
    };

    const normalizedDocs = await provider.search(searchOptions);
    console.log(`✅ 2. Found ${normalizedDocs.length} Normalized Patent Documents.`);

    const doc1 = normalizedDocs[0];
    console.log('   Publication Number:', doc1.publicationNumber);
    console.log('   Title:', doc1.title);
    console.log('   Source:', doc1.source);
    console.log('   IPC Codes:', doc1.ipcCodes);
    console.log('   CPC Codes:', doc1.cpcCodes);
    console.log('   Inventors:', doc1.inventors);
    console.log('   Applicants:', doc1.applicants);
    console.log('   Filing Date:', doc1.filingDate?.toISOString().split('T')[0]);
    console.log('   Publication Date:', doc1.publicationDate?.toISOString().split('T')[0]);

    // 3. Test Database Ingestion & Deduplication
    console.log('\n3. Testing PostgreSQL Database Ingestion & Deduplication...');
    const ingestedDocs = await searchAndIngestPriorArt(searchOptions, provider);
    console.log(`✅ 3. Ingested & Upserted ${ingestedDocs.length} PriorArtDocument Records into PostgreSQL.`);

    // Perform ingestion a second time to verify deduplication via unique publicationNumber
    const repeatIngestedDocs = await searchAndIngestPriorArt(searchOptions, provider);
    console.log(`✅ 3b. Re-Ingestion Verified: ${repeatIngestedDocs.length} Records Upserted Without Violating Unique Constraints.`);

    // 4. Verify Record in PostgreSQL
    const dbRecord = await prisma.priorArtDocument.findUnique({
      where: { publicationNumber: doc1.publicationNumber },
    });

    if (!dbRecord) {
      throw new Error(`FAILED: PriorArtDocument record for ${doc1.publicationNumber} was not found in PostgreSQL!`);
    }

    console.log('\n✅ 4. PostgreSQL Record State Verified:');
    console.log('   DB ID:', dbRecord.id);
    console.log('   DB Publication Number:', dbRecord.publicationNumber);
    console.log('   DB Title:', dbRecord.title);
    console.log('   DB Source:', dbRecord.source);

    // 5. Test Document Fetch by Publication Number
    console.log('\n5. Testing getPriorArtByPublicationNumber Lookup...');
    const fetchedDoc = await getPriorArtByPublicationNumber(doc1.publicationNumber, provider);

    if (!fetchedDoc || fetchedDoc.publicationNumber !== doc1.publicationNumber) {
      throw new Error('FAILED: getPriorArtByPublicationNumber failed to retrieve document!');
    }

    console.log('✅ 5. Lookup Success! Retrieved:', fetchedDoc.publicationNumber);

    console.log('\n🎉 PATENT-DATA PROVIDER ARCHITECTURE VERIFIED 100% SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n❌ Patent Provider Test Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPatentProviderArchitecture();
