import Groq from 'groq-sdk';

/**
 * Server-side Singleton for Groq SDK Client.
 * Never import or execute this module in client components or browser code.
 */
let groqClientInstance: Groq | null = null;
let mockCompletionHandler: ((options: CompletionOptions) => Promise<any>) | null = null;

/**
 * Configure or reset a mock completion handler for unit tests.
 */
export function setMockGroqHandler(handler: ((options: CompletionOptions) => Promise<any>) | null): void {
  mockCompletionHandler = handler;
}

/**
 * Verify server-side execution environment and absence of client-exposed credentials.
 */
export function assertServerOnlyGroq(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: Groq client cannot be initialized on the client-side.');
  }

  if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    throw new Error('Security Violation: NEXT_PUBLIC_GROQ_API_KEY detected. GROQ_API_KEY must never be exposed as public.');
  }
}

/**
 * Check if a valid, non-placeholder Groq API key is present in environment.
 */
export function isGroqConfigured(): boolean {
  assertServerOnlyGroq();
  const apiKey = process.env.GROQ_API_KEY;
  return !!apiKey && !apiKey.includes('placeholder') && !apiKey.includes('your_groq_api_key');
}

export function getGroqClient(): Groq {
  assertServerOnlyGroq();

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.includes('placeholder') || apiKey.includes('your_groq_api_key')) {
    throw new Error('GROQ_API_KEY environment variable is not configured on the server.');
  }

  if (!groqClientInstance) {
    groqClientInstance = new Groq({
      apiKey,
    });
  }

  return groqClientInstance;
}

/**
 * Returns configurable model identifier from environment, defaulting to llama-3.3-70b-versatile.
 */
export function getGroqModel(): string {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
}

/**
 * Returns configurable Top-K prior art count to send to Groq for cost control (default: 5).
 */
export function getGroqTopK(): number {
  const parsed = parseInt(process.env.GROQ_TOP_K || '5', 10);
  return isNaN(parsed) || parsed <= 0 ? 5 : Math.min(10, parsed);
}

export interface CompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  jsonSchema?: {
    name: string;
    schema: Record<string, any>;
  };
}

/**
 * Helper function with exponential backoff retry for transient network / rate-limit errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimitOrServerErr =
      error?.status === 429 ||
      (error?.status >= 500 && error?.status < 600) ||
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit') ||
      error?.message?.includes('timeout') ||
      error?.name === 'AbortError';

    const isDailyQuotaExhausted =
      error?.message?.includes('tokens per day (TPD)') ||
      error?.message?.includes('tokens per day') ||
      error?.message?.includes('requests per day (RPD)') ||
      error?.message?.includes('requests per day');

    if (retries > 0 && isRateLimitOrServerErr && !isDailyQuotaExhausted) {
      let actualDelay = delayMs;
      const retryMatch = error?.message?.match(/Please try again in ([0-9.]+)s/i);
      if (retryMatch && retryMatch[1]) {
        const groqSec = parseFloat(retryMatch[1]);
        if (!isNaN(groqSec) && groqSec > 0) {
          actualDelay = Math.max(actualDelay, Math.ceil(groqSec * 1000) + 750);
        }
      }

      const sanitizedMsg =
        error?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED]') || 'Transient error';
      console.warn(
        `[Groq AI Warning] Request failed (${sanitizedMsg}). Retrying in ${actualDelay}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

/**
 * High-level abstraction for generating plain text completions.
 */
export async function generateTextCompletion(options: CompletionOptions): Promise<string> {
  assertServerOnlyGroq();

  if (mockCompletionHandler) {
    return mockCompletionHandler(options);
  }

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
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 2048,
      });

      return response.choices[0]?.message?.content || '';
    } catch (err: any) {
      const sanitizedError =
        err?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]') || 'Groq API error';
      console.error('[Groq AI Error] Text completion failed:', sanitizedError);
      throw new Error(`AI Completion Service Error: ${sanitizedError}`);
    }
  });
}

/**
 * Helper to safely extract and parse JSON from raw text string.
 * Strictly avoids inventing missing fields or guessing semantic content.
 */
export function extractAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown ```json ... ``` blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract JSON object {...} or array [...]
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

  if (objectMatch && (!arrayMatch || objectMatch.index! <= arrayMatch.index!)) {
    cleaned = objectMatch[0];
  } else if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  return JSON.parse(cleaned) as T;
}

/**
 * High-level abstraction for generating structured JSON completions with resilient parsing.
 */
export async function generateStructuredCompletion<T>(options: CompletionOptions): Promise<T> {
  assertServerOnlyGroq();

  if (mockCompletionHandler) {
    const rawMock = await mockCompletionHandler(options);
    if (typeof rawMock === 'string') {
      return extractAndParseJson<T>(rawMock);
    }
    return rawMock as T;
  }

  const client = getGroqClient();
  const model = options.model || getGroqModel();

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

  const systemInstructions =
    (options.systemPrompt ? `${options.systemPrompt}\n\n` : '') +
    'CRITICAL INSTRUCTION: Return ONLY a valid, raw JSON payload matching the requested schema. Do NOT wrap in markdown backticks or preface with conversational text.';

  messages.push({
    role: 'system',
    content: systemInstructions,
  });

  messages.push({
    role: 'user',
    content: options.prompt,
  });

  // Strict Structured Outputs response_format configuration (Part F)
  let responseFormat: any = { type: 'json_object' };
  if (options.jsonSchema) {
    responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: options.jsonSchema.name,
        strict: true,
        schema: options.jsonSchema.schema,
      },
    };
  }

  return withRetry(async () => {
    try {
      // Strictly enforce Tool Isolation (Part H): tools: undefined, tool_choice: undefined
      let response;
      try {
        response = await client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 5000,
          response_format: responseFormat,
          tools: undefined,
        });
      } catch (reqErr: any) {
        if (
          responseFormat?.type === 'json_schema' &&
          (reqErr?.message?.includes('does not support response format `json_schema`') ||
           reqErr?.error?.message?.includes('does not support response format `json_schema`') ||
           reqErr?.status === 400)
        ) {
          console.warn(`[Groq AI Notice] Model ${model} does not support json_schema response_format. Falling back to json_object.`);
          response = await client.chat.completions.create({
            model,
            messages,
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ?? 5000,
            response_format: { type: 'json_object' },
            tools: undefined,
          });
        } else {
          throw reqErr;
        }
      }

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
      const sanitizedError =
        err?.message?.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]') || 'Groq API error';
      console.error('[Groq AI Error] Structured JSON completion failed:', sanitizedError);
      throw new Error(`AI Structured Completion Error: ${sanitizedError}`);
    }
  });
}
