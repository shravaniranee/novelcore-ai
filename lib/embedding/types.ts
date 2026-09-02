/**
 * Embedding Result Data Model
 */
export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
}

/**
 * Generic Embedding Provider Interface
 * NovelCore AI code depends on this abstraction, enabling pluggable providers.
 */
export interface EmbeddingProvider {
  /** Provider identifier (e.g. 'openai') */
  readonly name: string;

  /** Embedding model identifier (e.g. 'text-embedding-3-small') */
  readonly model: string;

  /** Vector dimensionality (e.g. 1536) */
  readonly dimensions: number;

  /** Embed single text string */
  embedText(text: string): Promise<EmbeddingResult>;

  /** Embed array of text strings in batch */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}
