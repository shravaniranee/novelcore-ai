import { prisma } from '../lib/prisma';

async function initHnswIndex() {
  console.log('⚡ Verifying & Creating HNSW Vector Index on PostgreSQL...');

  try {
    // 1. Check pgvector extension
    const ext: any = await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector';`;
    console.log('✅ pgvector extension active:', ext[0]?.extname || 'vector');

    // 2. Create HNSW Cosine Index on prior_art_documents
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "prior_art_documents_embedding_hnsw_idx" 
      ON "prior_art_documents" 
      USING hnsw (embedding vector_cosine_ops);
    `);

    console.log('✅ HNSW Cosine Index created/verified on "prior_art_documents"!');

    // 3. Inspect index metadata from pg_indexes
    const indexes: any = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'prior_art_documents';
    `;

    console.log('\n📋 Active Database Indexes on prior_art_documents:');
    indexes.forEach((idx: any) => console.log(` - ${idx.indexname}: ${idx.indexdef}`));

  } catch (err: any) {
    console.error('❌ Failed to create HNSW index:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initHnswIndex();
