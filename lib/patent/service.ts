import { prisma } from '@/lib/prisma';
import { LensPatentProvider } from './providers/lens';
import { PatentsViewProvider } from './providers/patentsview';
import { NormalizedPatentDocument, PatentProvider, PatentSearchOptions } from './types';
import { embedAndStorePriorArtDoc } from '@/lib/embedding/service';

/**
 * Default Patent Provider Instance
 * Can be swapped easily (e.g. PatentsViewProvider, LensPatentProvider, EPOProvider) without altering application logic.
 */
let defaultPatentProvider: PatentProvider = new PatentsViewProvider();

export function setPatentProvider(provider: PatentProvider) {
  defaultPatentProvider = provider;
}

export function getPatentProvider(): PatentProvider {
  return defaultPatentProvider;
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
 * Core Patent Ingestion Pipeline:
 * 1. Queries PatentProvider API for normalized patent documents.
 * 2. Normalizes records into PriorArtDocument fields (publicationNumber, title, abstract, claims, dates, IPC/CPC, inventors, applicants, source, url, rawMetadata).
 * 3. Upserts records into PostgreSQL (idempotent duplicate prevention via publicationNumber @unique index).
 * 4. Automatically triggers vector embedding generation via EmbeddingProvider.
 * 5. Persists embedding, embeddingModel, and embeddingDim into pgvector.
 * 6. NO Groq LLM calls executed during ingestion.
 */
export async function searchAndIngestPriorArt(
  options: PatentSearchOptions,
  customProvider?: PatentProvider
): Promise<IngestionResult[]> {
  const provider = customProvider || getPatentProvider();

  // 1. Search provider API
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

    // Upsert into Prisma PriorArtDocument table (Idempotent duplicate prevention)
    const dbRecord = await prisma.priorArtDocument.upsert({
      where: { publicationNumber: doc.publicationNumber },
      update: {
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
        source: doc.source,
        filingDate: doc.filingDate,
        publicationDate: doc.publicationDate,
        ipcCodes: doc.ipcCodes,
        metadata: {
          cpcCodes: doc.cpcCodes,
          inventors: doc.inventors,
          applicants: doc.applicants,
          url: doc.url,
          ...doc.rawMetadata,
        },
      },
      create: {
        publicationNumber: doc.publicationNumber,
        title: doc.title,
        abstract: doc.abstract,
        claimsText: claimsTextStr,
        source: doc.source,
        jurisdiction: doc.publicationNumber.split('-')[0] || 'US',
        filingDate: doc.filingDate,
        publicationDate: doc.publicationDate,
        ipcCodes: doc.ipcCodes,
        metadata: {
          cpcCodes: doc.cpcCodes,
          inventors: doc.inventors,
          applicants: doc.applicants,
          url: doc.url,
          ...doc.rawMetadata,
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
        publicationNumber: dbRecord.publicationNumber,
        title: dbRecord.title,
        abstract: dbRecord.abstract,
        claims: dbRecord.claimsText ? dbRecord.claimsText.split('\n\n') : [],
        source: dbRecord.source,
        filingDate: dbRecord.filingDate,
        publicationDate: dbRecord.publicationDate,
        ipcCodes: dbRecord.ipcCodes,
        cpcCodes: (dbRecord.metadata as any)?.cpcCodes || [],
        inventors: (dbRecord.metadata as any)?.inventors || [],
        applicants: (dbRecord.metadata as any)?.applicants || [],
        url: (dbRecord.metadata as any)?.url || null,
        rawMetadata: (dbRecord.metadata as any) || {},
      },
    });
  }

  return results;
}

/**
 * Fetches a single prior art document by publication number, attempting local DB lookup first then provider API.
 */
export async function getPriorArtByPublicationNumber(
  publicationNumber: string,
  customProvider?: PatentProvider
): Promise<NormalizedPatentDocument | null> {
  // 1. Check local PostgreSQL database first
  const localDbDoc = await prisma.priorArtDocument.findUnique({
    where: { publicationNumber },
  });

  if (localDbDoc) {
    return {
      publicationNumber: localDbDoc.publicationNumber,
      title: localDbDoc.title,
      abstract: localDbDoc.abstract,
      claims: localDbDoc.claimsText ? localDbDoc.claimsText.split('\n\n') : [],
      source: localDbDoc.source,
      filingDate: localDbDoc.filingDate,
      publicationDate: localDbDoc.publicationDate,
      ipcCodes: localDbDoc.ipcCodes,
      cpcCodes: (localDbDoc.metadata as any)?.cpcCodes || [],
      inventors: (localDbDoc.metadata as any)?.inventors || [],
      applicants: (localDbDoc.metadata as any)?.applicants || [],
      url: (localDbDoc.metadata as any)?.url || null,
      rawMetadata: (localDbDoc.metadata as any) || {},
    };
  }

  // 2. Fall back to provider lookup if not found locally
  const provider = customProvider || getPatentProvider();
  const remoteDoc = await provider.getDocument(publicationNumber);

  if (!remoteDoc) return null;

  // Ingest remote doc into local database
  const ingested = await searchAndIngestPriorArt({ query: publicationNumber }, provider);
  return ingested[0]?.document || remoteDoc;
}
