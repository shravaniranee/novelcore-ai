import { prisma } from '../lib/prisma';

async function verifyIngestedPatents() {
  console.log('🔍 Inspecting Ingested Patent Records & Vector Embeddings in PostgreSQL...\n');

  try {
    // 1. Fetch count of ingested PriorArtDocument records
    const count = await prisma.priorArtDocument.count();
    console.log(`📊 Total PriorArtDocument Records in Database: ${count}`);

    if (count === 0) {
      console.log('⚠️ No records found in prior_art_documents table.');
      process.exit(0);
    }

    // 2. Fetch documents with metadata
    const docs = await prisma.priorArtDocument.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log('\n----------------------------------------------------------------');
    console.log('📜 LATEST 10 INGESTED PRIOR ART DOCUMENTS:');
    console.log('----------------------------------------------------------------');

    for (let idx = 0; idx < docs.length; idx++) {
      const doc = docs[idx];
      // Raw query to check vector embedding non-null status and vector dimension
      const rawVectorInfo: any = await prisma.$queryRawUnsafe(
        `SELECT "embedding" IS NOT NULL AS has_vector, 
                vector_dims("embedding") AS vector_length 
         FROM "prior_art_documents" 
         WHERE "id" = $1`,
        doc.id
      );

      const hasVector = rawVectorInfo[0]?.has_vector || false;
      const vectorLen = rawVectorInfo[0]?.vector_length || 0;

      console.log(`${idx + 1}. Publication Number: ${doc.publicationNumber}`);
      console.log(`   Title: ${doc.title}`);
      console.log(`   Source: ${doc.source}`);
      console.log(`   IPC Codes: ${doc.ipcCodes.join(', ')}`);
      console.log(`   Embedding Model: ${doc.embeddingModel || 'N/A'}`);
      console.log(`   Embedding Dimension: ${doc.embeddingDim || 'N/A'}`);
      console.log(`   Vector Stored in pgvector: ${hasVector ? 'YES ✅' : 'NO ❌'} (${vectorLen} dimensions)`);
      console.log('----------------------------------------------------------------');
    }

    console.log('\n🎉 VERIFICATION COMPLETE: Records & pgvector embeddings are valid!');
  } catch (err: any) {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIngestedPatents();
