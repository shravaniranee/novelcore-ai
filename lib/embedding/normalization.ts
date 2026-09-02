/**
 * Reusable, deterministic text normalization functions for vector embedding generation.
 * Ensures reproducible text inputs across prior-art documents and inventions.
 */

export interface PriorArtEmbeddingInput {
  title: string;
  abstract: string;
  claimsText?: string | null;
  claims?: string[] | null;
}

export interface InventionEmbeddingInput {
  title: string;
  problem: string;
  solution: string;
  howItWorks: string;
  differentiation: string;
}

/**
 * Constructs reproducible, normalized text input for PriorArtDocument embeddings.
 */
export function getPriorArtEmbeddingText(doc: PriorArtEmbeddingInput): string {
  const title = (doc.title || '').trim();
  const abstract = (doc.abstract || '').trim();
  
  let claimsStr = '';
  if (doc.claimsText) {
    claimsStr = doc.claimsText.trim();
  } else if (Array.isArray(doc.claims)) {
    claimsStr = doc.claims.join('\n').trim();
  }

  return `Title: ${title}\n\nAbstract: ${abstract}\n\nClaims:\n${claimsStr}`.trim();
}

/**
 * Constructs reproducible, normalized text input for Invention embeddings.
 */
export function getInventionEmbeddingText(invention: InventionEmbeddingInput): string {
  const title = (invention.title || '').trim();
  const problem = (invention.problem || '').trim();
  const solution = (invention.solution || '').trim();
  const howItWorks = (invention.howItWorks || '').trim();
  const differentiation = (invention.differentiation || '').trim();

  return `Title: ${title}\n\nProblem Statement:\n${problem}\n\nTechnical Solution:\n${solution}\n\nMechanism of Action:\n${howItWorks}\n\nDifferentiation:\n${differentiation}`.trim();
}
