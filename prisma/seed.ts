import { prisma } from '../lib/prisma';
import { DUMMY_PATENT_DATASET } from '../lib/patent/datasets/dummy-patents';
import { getPriorArtEmbeddingText } from '../lib/embedding/normalization';
import { getEmbeddingProvider } from '../lib/embedding/service';

async function seed() {
  console.log('🌱 Starting NovelCore AI Database Seeding (DEMO Mode)...');
  console.log(`📦 Seeding ${DUMMY_PATENT_DATASET.length} realistic fictional patent records into PostgreSQL...\n`);

  const embeddingProvider = getEmbeddingProvider();
  console.log(`🤖 Using Embedding Provider: ${embeddingProvider.name} (${embeddingProvider.model}, ${embeddingProvider.dimensions}-dim)\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let embeddedCount = 0;

  for (const doc of DUMMY_PATENT_DATASET) {
    const claimsTextStr = doc.claims.join('\n\n');

    // 1. Check if record exists
    const existing = await prisma.priorArtDocument.findUnique({
      where: { publicationNumber: doc.publicationNumber },
      select: { id: true },
    });

    if (existing) {
      updatedCount++;
    } else {
      createdCount++;
    }

    // 2. Upsert record into PostgreSQL
    const dbRecord = await prisma.priorArtDocument.upsert({
      where: { publicationNumber: doc.publicationNumber },
      update: {
        externalId: doc.externalId || doc.publicationNumber,
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
        description: doc.description || doc.abstract,
        source: 'DEMO',
        jurisdiction: doc.jurisdiction || 'US',
        filingDate: doc.filingDate,
        publicationDate: doc.publicationDate,
        priorityDate: doc.priorityDate,
        ipcCodes: doc.ipcCodes,
        cpcCodes: doc.cpcCodes,
        inventors: doc.inventors,
        applicants: doc.applicants,
        assignees: doc.assignees || doc.applicants,
        sourceUrl: doc.sourceUrl || doc.url,
        metadata: {
          technologyDomain: doc.technologyDomain,
          ...(doc.rawMetadata || {}),
        },
      },
      create: {
        externalId: doc.externalId || doc.publicationNumber,
        publicationNumber: doc.publicationNumber,
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
        description: doc.description || doc.abstract,
        source: 'DEMO',
        jurisdiction: doc.jurisdiction || 'US',
        filingDate: doc.filingDate,
        publicationDate: doc.publicationDate,
        priorityDate: doc.priorityDate,
        ipcCodes: doc.ipcCodes,
        cpcCodes: doc.cpcCodes,
        inventors: doc.inventors,
        applicants: doc.applicants,
        assignees: doc.assignees || doc.applicants,
        sourceUrl: doc.sourceUrl || doc.url,
        metadata: {
          technologyDomain: doc.technologyDomain,
          ...(doc.rawMetadata || {}),
        },
      },
    });

    // 3. Generate deterministic normalized embedding text & vector
    try {
      const normalizedText = getPriorArtEmbeddingText({
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
      });

      const embedResult = await embeddingProvider.embedText(normalizedText);

      // Persist vector into pgvector column
      const vectorStr = `[${embedResult.vector.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "prior_art_documents" 
         SET "embedding" = $1::vector, 
             "embeddingModel" = $2, 
             "embeddingDim" = $3, 
             "updatedAt" = CURRENT_TIMESTAMP 
         WHERE "id" = $4`,
        vectorStr,
        embedResult.model,
        embedResult.dimensions,
        dbRecord.id
      );

      embeddedCount++;
      process.stdout.write(`   ✓ [${dbRecord.publicationNumber}] ${doc.title.substring(0, 48)}... (Vector: 1536-dim)\n`);
    } catch (err: any) {
      console.warn(`   ⚠️ Embedding warning for ${doc.publicationNumber}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 DATABASE SEEDING COMPLETE!');
  console.log(`   Total Records Processed: ${DUMMY_PATENT_DATASET.length}`);
  console.log(`   New Records Created:     ${createdCount}`);
  console.log(`   Existing Updated:        ${updatedCount}`);
  console.log(`   Vectors Stored:          ${embeddedCount} (1536 dimensions in pgvector)`);
  console.log('================================================================\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
