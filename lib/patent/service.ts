import { prisma } from '@/lib/prisma';
import { DummyPatentProvider } from './providers/dummy';
import { PatentsViewProvider } from './providers/patentsview';
import { NormalizedPatentDocument, PatentProvider, PatentSearchOptions } from './types';
import { embedAndStorePriorArtDoc } from '@/lib/embedding/service';

/**
 * Factory creating active Patent Provider based on DEMO_MODE configuration.
 */
function createDefaultProvider(): PatentProvider {
  const isDemoMode = process.env.DEMO_MODE !== 'false'; // Defaults to DEMO mode for safety
  if (isDemoMode) {
    return new DummyPatentProvider();
  }
  return new PatentsViewProvider();
}

let activePatentProvider: PatentProvider = createDefaultProvider();

export function setPatentProvider(provider: PatentProvider) {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode && !(provider instanceof DummyPatentProvider)) {
    console.warn(`[Security Guard] Blocked attempt to register external provider '${provider.name}' while DEMO_MODE is active.`);
    return;
  }
  activePatentProvider = provider;
}

export function getPatentProvider(): PatentProvider {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode && !(activePatentProvider instanceof DummyPatentProvider)) {
    activePatentProvider = new DummyPatentProvider();
  }
  return activePatentProvider;
}

export interface IngestionResult {
  publicationNumber: string;
  id: string;
  action: 'created' | 'updated';
  embedded: boolean;
  embeddingModel?: string;
  embeddingDim?: number;
  document: NormalizedPatentDocument;
}

/**
 * Searches patent data provider and ingests/upserts normalized results into PostgreSQL PriorArtDocument model.
 * Idempotent duplicate prevention via publicationNumber unique index.
 * Automatically computes and persists vector embeddings via pgvector.
 */
export async function searchAndIngestPriorArt(
  options: PatentSearchOptions,
  customProvider?: PatentProvider
): Promise<IngestionResult[]> {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  const provider = isDemoMode ? new DummyPatentProvider() : (customProvider || getPatentProvider());

  // 1. Search provider (in Demo mode, queries local curated dataset with zero external network calls)
  const rawNormalizedDocs = await provider.search(options);

  // 2. Ingest, deduplicate, and embed each document in PostgreSQL
  const results: IngestionResult[] = [];

  for (const doc of rawNormalizedDocs) {
    const claimsTextStr = Array.isArray(doc.claims) ? doc.claims.join('\n\n') : String(doc.claims || '');

    // Check if record exists before upsert to track created vs updated status
    const existingDoc = await prisma.priorArtDocument.findUnique({
      where: { publicationNumber: doc.publicationNumber },
      select: { id: true },
    });

    const action = existingDoc ? 'updated' : 'created';

    // Upsert into Prisma PriorArtDocument table
    const dbRecord = await prisma.priorArtDocument.upsert({
      where: { publicationNumber: doc.publicationNumber },
      update: {
        externalId: doc.externalId || doc.publicationNumber,
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
        description: doc.description || doc.abstract,
        source: doc.source || 'DEMO',
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
        source: doc.source || 'DEMO',
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

    // 3. Generate & persist vector embedding using EmbeddingProvider
    let embedded = false;
    let embeddingModel: string | undefined;
    let embeddingDim: number | undefined;

    try {
      const embedResult = await embedAndStorePriorArtDoc(dbRecord.id);
      embedded = true;
      embeddingModel = embedResult.model;
      embeddingDim = embedResult.dimensions;
    } catch (embedErr: any) {
      console.warn(`[Ingestion Warning] Embedding generation failed for ${doc.publicationNumber}:`, embedErr.message);
    }

    results.push({
      publicationNumber: dbRecord.publicationNumber,
      id: dbRecord.id,
      action,
      embedded,
      embeddingModel,
      embeddingDim,
      document: {
        id: dbRecord.id,
        externalId: dbRecord.externalId || dbRecord.publicationNumber,
        publicationNumber: dbRecord.publicationNumber,
        title: dbRecord.title,
        abstract: dbRecord.abstract,
        claims: dbRecord.claimsText ? dbRecord.claimsText.split('\n\n') : [],
        description: dbRecord.description || '',
        source: dbRecord.source,
        jurisdiction: dbRecord.jurisdiction,
        filingDate: dbRecord.filingDate,
        publicationDate: dbRecord.publicationDate,
        priorityDate: dbRecord.priorityDate,
        ipcCodes: dbRecord.ipcCodes,
        cpcCodes: dbRecord.cpcCodes,
        inventors: dbRecord.inventors,
        applicants: dbRecord.applicants,
        assignees: dbRecord.assignees,
        url: dbRecord.sourceUrl,
        sourceUrl: dbRecord.sourceUrl,
        technologyDomain: (dbRecord.metadata as any)?.technologyDomain || 'General Technology',
        rawMetadata: (dbRecord.metadata as any) || {},
      },
    });
  }

  return results;
}

/**
 * Fetches a single prior art document by publication number, attempting local DB lookup first then provider.
 */
export async function getPriorArtByPublicationNumber(
  publicationNumber: string,
  customProvider?: PatentProvider
): Promise<NormalizedPatentDocument | null> {
  const localDbDoc = await prisma.priorArtDocument.findUnique({
    where: { publicationNumber },
  });

  if (localDbDoc) {
    return {
      id: localDbDoc.id,
      externalId: localDbDoc.externalId || localDbDoc.publicationNumber,
      publicationNumber: localDbDoc.publicationNumber,
      title: localDbDoc.title,
      abstract: localDbDoc.abstract,
      claims: localDbDoc.claimsText ? localDbDoc.claimsText.split('\n\n') : [],
      description: localDbDoc.description || '',
      source: localDbDoc.source,
      jurisdiction: localDbDoc.jurisdiction,
      filingDate: localDbDoc.filingDate,
      publicationDate: localDbDoc.publicationDate,
      priorityDate: localDbDoc.priorityDate,
      ipcCodes: localDbDoc.ipcCodes,
      cpcCodes: localDbDoc.cpcCodes,
      inventors: localDbDoc.inventors,
      applicants: localDbDoc.applicants,
      assignees: localDbDoc.assignees,
      url: localDbDoc.sourceUrl,
      sourceUrl: localDbDoc.sourceUrl,
      technologyDomain: (localDbDoc.metadata as any)?.technologyDomain || 'General Technology',
      rawMetadata: (localDbDoc.metadata as any) || {},
    };
  }

  const isDemoMode = process.env.DEMO_MODE !== 'false';
  const provider = isDemoMode ? new DummyPatentProvider() : (customProvider || getPatentProvider());
  const remoteDoc = await provider.getByPublicationNumber(publicationNumber);

  if (!remoteDoc) return null;

  const ingested = await searchAndIngestPriorArt({ query: publicationNumber }, provider);
  return ingested[0]?.document || remoteDoc;
}
