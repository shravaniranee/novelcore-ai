/**
 * Normalized Patent Document Interface
 * Standardized data model across all patent data providers (Dummy, USPTO, EPO, Google Patents, Lens.org).
 */
export interface NormalizedPatentDocument {
  id?: string;
  externalId?: string;
  publicationNumber: string;
  title: string;
  abstract: string;
  claims: string[];
  description?: string;
  source: string;
  jurisdiction?: string;
  filingDate: Date | null;
  publicationDate: Date | null;
  priorityDate?: Date | null;
  ipcCodes: string[];
  cpcCodes: string[];
  inventors: string[];
  applicants: string[];
  assignees?: string[];
  url?: string | null;
  sourceUrl?: string | null;
  technologyDomain?: string;
  rawMetadata?: Record<string, any>;
}

export interface PatentSearchOptions {
  keywords?: string[];
  ipcCodes?: string[];
  cpcCodes?: string[];
  query?: string;
  domain?: string;
  limit?: number;
  offset?: number;
  jurisdictions?: string[];
}

/**
 * Generic Patent Provider Interface
 * NovelCore AI code depends on this abstraction, isolating provider-specific logic.
 */
export interface PatentProvider {
  /** Unique provider identifier (e.g., 'dummy_provider', 'patentsview', 'lens_org') */
  readonly name: string;

  /** Search patent database using keywords, query, domain, or IPC codes */
  search(options: PatentSearchOptions): Promise<NormalizedPatentDocument[]>;

  /** Retrieve single patent document by internal or external ID */
  getById(id: string): Promise<NormalizedPatentDocument | null>;

  /** Retrieve single patent document by publication number */
  getByPublicationNumber(publicationNumber: string): Promise<NormalizedPatentDocument | null>;

  /** Retrieve single patent document by publication number (alias) */
  getDocument(publicationNumber: string): Promise<NormalizedPatentDocument | null>;

  /** Normalize raw provider response payload into standard model */
  normalizeDocument(raw: any): NormalizedPatentDocument;
}
