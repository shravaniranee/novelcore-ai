/**
 * Normalized Patent Document Interface
 * Standardized data model across all patent data providers (Lens.org, USPTO, EPO, Google Patents).
 */
export interface NormalizedPatentDocument {
  publicationNumber: string;
  title: string;
  abstract: string;
  claims: string[];
  source: string;
  filingDate: Date | null;
  publicationDate: Date | null;
  ipcCodes: string[];
  cpcCodes: string[];
  inventors: string[];
  applicants: string[];
  url: string | null;
  rawMetadata: Record<string, any>;
}

export interface PatentSearchOptions {
  keywords?: string[];
  ipcCodes?: string[];
  query?: string;
  limit?: number;
  offset?: number;
  jurisdictions?: string[];
}

/**
 * Generic Patent Provider Interface
 * NovelCore AI code depends on this abstraction, isolating provider-specific APIs.
 */
export interface PatentProvider {
  /** Unique provider identifier (e.g., 'lens_org', 'patentsview', 'epo_ops') */
  readonly name: string;

  /** Search patent database using keywords, query, or IPC codes */
  search(options: PatentSearchOptions): Promise<NormalizedPatentDocument[]>;

  /** Retrieve single patent document by publication number */
  getDocument(publicationNumber: string): Promise<NormalizedPatentDocument | null>;

  /** Normalize raw provider response payload into standard model */
  normalizeDocument(raw: any): NormalizedPatentDocument;
}
