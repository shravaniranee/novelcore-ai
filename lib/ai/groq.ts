import Groq from 'groq-sdk';

/**
 * Server-side Singleton for Groq SDK Client.
 * Never import or execute this module in client components or browser code.
 */
let groqClientInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: Groq client cannot be initialized on the client-side.');
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'gsk_demo_key_placeholder') {
    throw new Error('GROQ_API_KEY environment variable is not configured on the server.');
  }

  if (!groqClientInstance) {
    groqClientInstance = new Groq({
      apiKey,
    });
  }

  return groqClientInstance;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL || 'groq/compound-mini';
}

export interface CompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Helper function with exponential backoff retry for transient network / rate-limit errors.
 */
async function withRetry<T>(
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
      const sanitizedMsg = error?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED]') || 'Transient error';
      console.warn(`[Groq AI Warning] Request failed (${sanitizedMsg}). Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

/**
 * High-level abstraction for generating plain text completions.
 */
export async function generateTextCompletion(options: CompletionOptions): Promise<string> {
  const client = getGroqClient();
  const model = options.model || getGroqModel();

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (options.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: options.prompt,
  });

  return withRetry(async () => {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
      });

      return response.choices[0]?.message?.content || '';
    } catch (err: any) {
      const sanitizedError = err?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]') || 'Groq API error';
      console.error('[Groq AI Error] Text completion failed:', sanitizedError);
      throw new Error(`AI Completion Service Error: ${sanitizedError}`);
    }
  });
}

/**
 * Helper to safely extract and parse JSON from raw text string.
 */
function extractAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown ```json ... ``` blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract JSON object {...}
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned) as T;
}

/**
 * High-level abstraction for generating structured JSON completions with resilient parsing.
 */
export async function generateStructuredCompletion<T>(options: CompletionOptions): Promise<T> {
  const client = getGroqClient();
  const model = options.model || getGroqModel();

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

  const systemInstructions =
    (options.systemPrompt ? `${options.systemPrompt}\n\n` : '') +
    'CRITICAL: Return ONLY a valid, raw JSON object matching the requested schema. Do NOT wrap in markdown, backticks, or prose.';

  messages.push({
    role: 'system',
    content: systemInstructions,
  });

  messages.push({
    role: 'user',
    content: options.prompt,
  });

  return withRetry(async () => {
    try {
      // Execute completion call directly without response_format flag to support compound models reliably
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 2048,
      });

      const content = response.choices[0]?.message?.content || '';
      if (!content || content.trim() === '{}' || content.trim() === '') {
        throw new Error('Groq model returned empty content.');
      }
      const parsed = extractAndParseJson<T>(content);
      if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
        throw new Error('Parsed JSON result is empty.');
      }
      return parsed;
    } catch (err: any) {
      const sanitizedError = err?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]') || 'Groq API error';
      console.error('[Groq AI Error] Structured JSON completion failed:', sanitizedError);
      throw new Error(`AI Structured Completion Error: ${sanitizedError}`);
    }
  });
}
