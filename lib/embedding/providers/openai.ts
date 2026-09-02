import OpenAI from 'openai';
import { EmbeddingProvider, EmbeddingResult } from '../types';

/**
 * Deterministic helper generating normalized 1536-dim vectors when API key is placeholder/offline.
 */
function generateDeterministicDummyVector(text: string, dimensions: number): number[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const vector: number[] = new Array(dimensions).fill(0);

  if (words.length === 0) {
    return vector;
  }

  for (const word of words) {
    let wordHash = 0;
    for (let i = 0; i < word.length; i++) {
      wordHash = (wordHash << 5) - wordHash + word.charCodeAt(i);
      wordHash |= 0;
    }
    for (let d = 0; d < dimensions; d++) {
      vector[d] += Math.sin(wordHash * 31 + d);
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => parseFloat((v / (norm || 1)).toFixed(6)));
}

/**
 * OpenAI Embedding Provider Implementation
 * Isolated server-side implementation using OpenAI text-embedding-3-small.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  public readonly model: string;
  public readonly dimensions: number;
  private client: OpenAI | null = null;
  private readonly timeoutMs = 10000;

  constructor(model = 'text-embedding-3-small', dimensions = 1536) {
    this.model = process.env.EMBEDDING_MODEL || model;
    this.dimensions = parseInt(process.env.EMBEDDING_DIM || String(dimensions), 10);
  }

  private hasLiveApiKey(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey && !apiKey.includes('demo-key-placeholder') && !apiKey.includes('your-openai-api-key');
  }

  private getClient(): OpenAI {
    if (typeof window !== 'undefined') {
      throw new Error('Security Violation: EmbeddingProvider cannot be executed on client-side.');
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!this.client && apiKey) {
      this.client = new OpenAI({
        apiKey,
        timeout: this.timeoutMs,
      });
    }

    if (!this.client) {
      throw new Error('OPENAI_API_KEY environment variable is not configured.');
    }

    return this.client;
  }

  /**
   * Helper function with exponential backoff retry for transient network / rate-limit errors.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimitOrServerErr =
        error?.status === 429 || (error?.status >= 500 && error?.status < 600);

      if (retries > 0 && isRateLimitOrServerErr) {
        const sanitizedMsg = error?.message?.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED]') || 'Transient error';
        console.warn(`[Embedding API Warning] Request failed (${sanitizedMsg}). Retrying in ${delayMs}ms... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.withRetry(fn, retries - 1, delayMs * 2);
      }
      throw error;
    }
  }

  public async embedText(text: string): Promise<EmbeddingResult> {
    const trimmed = (text || '').trim();

    if (!trimmed) {
      return {
        vector: new Array(this.dimensions).fill(0),
        dimensions: this.dimensions,
        model: this.model,
      };
    }

    // Fall back gracefully to deterministic dummy 1536-dim vector if API key is placeholder
    if (!this.hasLiveApiKey()) {
      const dummyVector = generateDeterministicDummyVector(trimmed, this.dimensions);
      return {
        vector: dummyVector,
        dimensions: this.dimensions,
        model: this.model,
      };
    }

    const client = this.getClient();

    return this.withRetry(async () => {
      const response = await client.embeddings.create({
        model: this.model,
        input: trimmed,
        dimensions: this.dimensions,
      });

      const embeddingData = response.data[0];
      if (!embeddingData || !embeddingData.embedding) {
        throw new Error('OpenAI API returned an invalid empty embedding payload.');
      }

      const vector = embeddingData.embedding;

      if (vector.length !== this.dimensions) {
        throw new Error(
          `Dimension Mismatch Error: Expected ${this.dimensions} dimensions from model ${this.model}, received ${vector.length}.`
        );
      }

      return {
        vector,
        dimensions: this.dimensions,
        model: this.model,
      };
    });
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (!this.hasLiveApiKey()) {
      return Promise.all(texts.map((t) => this.embedText(t)));
    }

    const client = this.getClient();
    const sanitizedTexts = texts.map((t) => (t || '').trim() || 'empty');

    return this.withRetry(async () => {
      const response = await client.embeddings.create({
        model: this.model,
        input: sanitizedTexts,
        dimensions: this.dimensions,
      });

      return response.data.map((item) => {
        const vector = item.embedding;
        if (vector.length !== this.dimensions) {
          throw new Error(
            `Dimension Mismatch Error in batch: Expected ${this.dimensions}, received ${vector.length}.`
          );
        }

        return {
          vector,
          dimensions: this.dimensions,
          model: this.model,
        };
      });
    });
  }
}
