import { NormalizedPatentDocument, PatentProvider, PatentSearchOptions } from '../types';

/**
 * Official PatentsView PatentSearch Provider Implementation
 * Server-side isolated patent API integration for USPTO PatentsView (https://patentsview.org).
 * Uses official PatentsView REST API query format (JSON-in-GET/POST queries).
 */
export class PatentsViewProvider implements PatentProvider {
  public readonly name = 'patentsview';
  private readonly baseUrl = 'https://search.patentsview.org/api/v1/patent/';
  private readonly legacyUrl = 'https://api.patentsview.org/patents/query';
  private readonly timeoutMs = 10000;

  private getApiKey(): string | null {
    if (typeof window !== 'undefined') {
      throw new Error('Security Violation: PatentsViewProvider cannot be executed on client-side.');
    }
    return process.env.PATENTSVIEW_API_KEY || process.env.PATENT_PROVIDER_API_KEY || null;
  }

  /**
   * Safe fetch with AbortController timeout & exponential backoff rate-limit retry logic.
   * Logs structured info while ensuring API key secrets are NEVER logged.
   */
  private async fetchWithTimeoutAndRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delayMs = 1000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        console.warn(
          `[PatentsView API Warning] HTTP ${response.status} (${durationMs}ms). Retrying in ${delayMs}ms... (${retries} retries left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.fetchWithTimeoutAndRetry(url, options, retries - 1, delayMs * 2);
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (retries > 0 && err.name !== 'AbortError') {
        console.warn(`[PatentsView API Warning] Request error (${err.message}, ${durationMs}ms). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.fetchWithTimeoutAndRetry(url, options, retries - 1, delayMs * 2);
      }

      throw new Error(`PatentsView API Request Failed: ${err.message}`);
    }
  }

  /**
   * Search USPTO PatentsView API using official query syntax.
   */
  public async search(options: PatentSearchOptions): Promise<NormalizedPatentDocument[]> {
    if (process.env.DEMO_MODE !== 'false') {
      throw new Error('Safety Violation: PatentsViewProvider is disabled while DEMO_MODE is active.');
    }

    const apiKey = this.getApiKey();
    const limit = Math.min(Math.max(options.limit || 10, 1), 20);
    const page = Math.floor((options.offset || 0) / limit) + 1;
    const queryTerms = (options.query || (options.keywords || []).join(' ') || 'artificial intelligence').trim();

    const queryObj = {
      _or: [
        { _text_any: { patent_title: queryTerms } },
        { _text_any: { patent_abstract: queryTerms } },
      ],
    };

    const fieldsObj = [
      'patent_number',
      'patent_title',
      'patent_abstract',
      'patent_date',
      'app_date',
      'inventors',
      'assignees',
      'cpcs',
      'ipcs',
    ];

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'NovelCoreAI/1.0',
    };

    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    // Try search API endpoint first, fallback to query endpoint if needed
    const targetUrl = apiKey ? this.baseUrl : this.legacyUrl;

    const queryUrl = `${targetUrl}?q=${encodeURIComponent(JSON.stringify(queryObj))}&f=${encodeURIComponent(
      JSON.stringify(fieldsObj)
    )}&s=${encodeURIComponent(JSON.stringify({ size: limit, from: (page - 1) * limit }))}`;

    console.log(`[PatentsView Provider] Executing live API request to ${targetUrl} for query: "${queryTerms}" (limit: ${limit})`);

    const response = await this.fetchWithTimeoutAndRetry(queryUrl, {
      method: 'GET',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || contentType.includes('text/html')) {
      if (!apiKey) {
        throw new Error(
          'PatentsView API Key Missing: PATENTSVIEW_API_KEY environment variable is not configured in .env.local. Please set PATENTSVIEW_API_KEY to perform live search queries against USPTO PatentsView.'
        );
      }
      const errorText = await response.text().catch(() => '');
      const sanitizedErr = errorText.replace(/key=[a-zA-Z0-9_-]+/g, 'key=[REDACTED]');
      throw new Error(`PatentsView API Error (HTTP ${response.status}): ${sanitizedErr.substring(0, 200)}`);
    }

    const payload = await response.json();
    const rawPatents: any[] = payload?.patents || payload?.results || [];

    console.log(`[PatentsView Provider] Received ${rawPatents.length} real patent records from USPTO PatentsView.`);

    return rawPatents.map((raw) => this.normalizeDocument(raw));
  }

  /**
   * Fetch single patent document by publication/patent number.
   */
  public async getDocument(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    const cleanNum = publicationNumber.replace(/^US-?/i, '').trim();
    const queryObj = { patent_number: cleanNum };
    const fieldsObj = [
      'patent_number',
      'patent_title',
      'patent_abstract',
      'patent_date',
      'app_date',
      'inventors',
      'assignees',
      'cpcs',
      'ipcs',
    ];

    const apiKey = this.getApiKey();
    const targetUrl = apiKey ? this.baseUrl : this.legacyUrl;

    const queryUrl = `${targetUrl}?q=${encodeURIComponent(JSON.stringify(queryObj))}&f=${encodeURIComponent(
      JSON.stringify(fieldsObj)
    )}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'NovelCoreAI/1.0',
    };
    if (apiKey) headers['X-Api-Key'] = apiKey;

    const response = await this.fetchWithTimeoutAndRetry(queryUrl, { method: 'GET', headers });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || contentType.includes('text/html')) return null;

    const payload = await response.json();
    const rawPatent = payload?.patents?.[0] || payload?.results?.[0];

    if (!rawPatent) return null;

    return this.normalizeDocument(rawPatent);
  }

  /**
   * Normalizes PatentsView raw API response payload into standard NormalizedPatentDocument model.
   */
  public normalizeDocument(raw: any): NormalizedPatentDocument {
    const patentNum = raw?.patent_number || raw?.patent_id || `UNKNOWN-${Date.now()}`;
    const pubNumber = patentNum.toUpperCase().startsWith('US-') ? patentNum.toUpperCase() : `US-${patentNum}`;

    const title = (raw?.patent_title || 'Untitled US Patent').trim();
    const abstract = (raw?.patent_abstract || 'No abstract text provided.').trim();

    const inventors: string[] = Array.isArray(raw?.inventors)
      ? raw.inventors
          .map((inv: any) => {
            const first = (inv?.inventor_first_name || '').trim();
            const last = (inv?.inventor_last_name || '').trim();
            return `${first} ${last}`.trim();
          })
          .filter(Boolean)
      : [];

    const applicants: string[] = Array.isArray(raw?.assignees)
      ? raw.assignees
          .map((ass: any) => (ass?.assignee_organization || `${ass?.assignee_first_name || ''} ${ass?.assignee_last_name || ''}`).trim())
          .filter(Boolean)
      : [];

    const ipcCodes: string[] = Array.isArray(raw?.ipcs)
      ? raw.ipcs
          .map((ipc: any) => ipc?.ipc_subclass || ipc?.ipc_class || ipc?.ipc_section)
          .filter(Boolean)
      : [];

    const cpcCodes: string[] = Array.isArray(raw?.cpcs)
      ? raw.cpcs
          .map((cpc: any) => cpc?.cpc_subclass || cpc?.cpc_class || cpc?.cpc_section)
          .filter(Boolean)
      : [];

    const publicationDate = raw?.patent_date ? new Date(raw.patent_date) : null;
    const filingDate = raw?.app_date ? new Date(raw.app_date) : null;

    return {
      publicationNumber: pubNumber,
      title,
      abstract,
      claims: [`1. An invention as specified in patent ${pubNumber}.`],
      source: 'patentsview',
      filingDate: isNaN(filingDate?.getTime() || NaN) ? null : filingDate,
      publicationDate: isNaN(publicationDate?.getTime() || NaN) ? null : publicationDate,
      ipcCodes: ipcCodes.length > 0 ? ipcCodes : ['G06F 17/00'],
      cpcCodes,
      inventors: inventors.length > 0 ? inventors : ['USPTO Inventor'],
      applicants: applicants.length > 0 ? applicants : ['USPTO Applicant'],
      url: `https://patentsview.org/patent/${patentNum}`,
      rawMetadata: raw || {},
    };
  }

  public async getByPublicationNumber(publicationNumber: string): Promise<NormalizedPatentDocument | null> {
    return this.getDocument(publicationNumber);
  }

  public async getById(id: string): Promise<NormalizedPatentDocument | null> {
    return this.getDocument(id);
  }
}
