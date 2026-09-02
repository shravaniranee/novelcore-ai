import { DUMMY_PATENT_DATASET } from '../datasets/dummy-patents';
import { NormalizedPatentDocument, PatentProvider, PatentSearchOptions } from '../types';

/**
 * Pure Internal Dummy Patent Provider for NovelCore AI Prototype & Demo Mode
 * Zero external API calls, operates against curated 32+ realistic fictional demo patent dataset.
 */
export class DummyPatentProvider implements PatentProvider {
  public readonly name = 'dummy_provider';
  private readonly dataset: NormalizedPatentDocument[];

  constructor(customDataset?: NormalizedPatentDocument[]) {
    this.dataset = customDataset || DUMMY_PATENT_DATASET;
  }

  /**
   * Search dummy patents using keyword, title, abstract, claims, and technology domain matching.
   */
  public async search(options: PatentSearchOptions): Promise<NormalizedPatentDocument[]> {
    const query = (options.query || '').trim().toLowerCase();
    const keywords = (options.keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
    const domain = (options.domain || '').trim().toLowerCase();
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    // Tokenize query terms
    const searchTerms = [
      ...query.split(/[\s,;]+/).filter((t) => t.length > 2),
      ...keywords,
    ];

    const scored = this.dataset.map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const abstractLower = doc.abstract.toLowerCase();
      const claimsLower = doc.claims.join(' ').toLowerCase();
      const domainLower = (doc.technologyDomain || '').toLowerCase();

      // Exact domain match boost
      if (domain && domainLower.includes(domain)) {
        score += 30;
      }

      // Exact publicationNumber or externalId match
      if (query && (doc.publicationNumber.toLowerCase() === query || (doc.externalId && doc.externalId.toLowerCase() === query))) {
        score += 100;
      }

      // Exact query phrase match in title or abstract
      if (query && titleLower.includes(query)) {
        score += 50;
      }
      if (query && abstractLower.includes(query)) {
        score += 30;
      }

      // Keyword term matching
      for (const term of searchTerms) {
        if (titleLower.includes(term)) score += 15;
        if (abstractLower.includes(term)) score += 8;
        if (claimsLower.includes(term)) score += 5;
        if (domainLower.includes(term)) score += 10;
      }

      // IPC/CPC code matches
      if (options.ipcCodes && options.ipcCodes.length > 0) {
        for (const code of options.ipcCodes) {
          if (doc.ipcCodes.some((ipc) => ipc.toLowerCase().includes(code.toLowerCase()))) {
            score += 25;
          }
        }
      }

      return { doc, score };
    });

    // If search criteria was specified, only return items with score > 0
    const hasCriteria = searchTerms.length > 0 || Boolean(domain) || (options.ipcCodes && options.ipcCodes.length > 0);
    const filtered = scored
      .filter((item) => (hasCriteria ? item.score > 0 : true))
      .sort((a, b) => b.score - a.score);

    const results = filtered.slice(offset, offset + limit);

    return results.map((item) => this.normalizeDocument(item.doc));
  }

  /**
   * Retrieve single patent document by ID (externalId or publicationNumber).
   */
  public async getById(id: string): Promise<NormalizedPatentDocument | null> {
    const cleanId = id.trim().toUpperCase();
    const found = this.dataset.find(
      (d) =>
        (d.externalId && d.externalId.toUpperCase() === cleanId) ||
        d.publicationNumber.toUpperCase() === cleanId ||
        (d.id && d.id === id)
    );

    return found ? this.normalizeDocument(found) : null;
  }

  /**
   * Retrieve single patent document by publication number.
   */
  public async getByPublicationNumber(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    return this.getById(publicationNumber);
  }

  /**
   * Retrieve single patent document by publication number (alias).
   */
  public async getDocument(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    return this.getByPublicationNumber(publicationNumber);
  }

  /**
   * Normalize document to guarantee standard structure.
   */
  public normalizeDocument(raw: any): NormalizedPatentDocument {
    const pubNumber = raw.publicationNumber || raw.externalId || `DEMO-US-${Date.now()}`;
    return {
      id: raw.id,
      externalId: raw.externalId || pubNumber,
      publicationNumber: pubNumber,
      title: raw.title || 'Untitled Demo Patent',
      abstract: raw.abstract || 'No abstract text available.',
      claims: Array.isArray(raw.claims) ? raw.claims : [raw.claims || '1. A demo claim.'],
      description: raw.description || raw.abstract || '',
      source: 'DEMO',
      jurisdiction: raw.jurisdiction || 'US',
      filingDate: raw.filingDate ? new Date(raw.filingDate) : null,
      publicationDate: raw.publicationDate ? new Date(raw.publicationDate) : null,
      priorityDate: raw.priorityDate ? new Date(raw.priorityDate) : null,
      ipcCodes: Array.isArray(raw.ipcCodes) ? raw.ipcCodes : [],
      cpcCodes: Array.isArray(raw.cpcCodes) ? raw.cpcCodes : [],
      inventors: Array.isArray(raw.inventors) ? raw.inventors : ['Demo Inventor'],
      applicants: Array.isArray(raw.applicants) ? raw.applicants : ['Demo Applicant'],
      assignees: Array.isArray(raw.assignees) ? raw.assignees : raw.applicants || ['Demo Assignee'],
      url: raw.sourceUrl || raw.url || `https://demo.novelcore.ai/patent/${pubNumber}`,
      sourceUrl: raw.sourceUrl || raw.url || `https://demo.novelcore.ai/patent/${pubNumber}`,
      technologyDomain: raw.technologyDomain || 'General Technology',
      rawMetadata: raw.rawMetadata || { demo: true },
    };
  }
}
