/**
 * scripts/test-groq-live.ts
 *
 * Opt-in live smoke test for Groq AI structured outputs.
 * Requirements:
 * 1. Single live request if GROQ_API_KEY is present.
 * 2. If GROQ_API_KEY is missing, exit 0 with a clear skip message.
 * 3. Never print the API key or authorization headers.
 * 4. Validate output using the strict Zod schema for technical concepts.
 * 5. Log configured model, request duration, token counts, validation pass/fail, and output preview.
 */

import { generateStructuredCompletion, isGroqConfigured, getGroqModel } from '../lib/ai/groq';
import { technicalConceptsSchema, technicalConceptsJsonSchema } from '../lib/validations/agent-outputs';

async function runLiveSmokeTest() {
  console.log('='.repeat(60));
  console.log('GROQ LIVE SMOKE TEST (PHASE 6.5)');
  console.log('='.repeat(60));

  if (!isGroqConfigured()) {
    console.log('[Groq Live Test] GROQ_API_KEY not set - skipping live smoke test.');
    process.exit(0);
  }

  const model = getGroqModel();
  console.log(`[Groq Live Test] Configured Model: ${model}`);
  console.log(`[Groq Live Test] Dispatching single live structured completion request...`);

  const startTime = Date.now();

  try {
    const rawResult = await generateStructuredCompletion<unknown>({
      prompt: `Extract technical concepts for this test disclosure:
Title: Solid-State Battery Thermal Management System
Domain: Energy Storage & Battery Systems
Problem: Lithium dendrite growth and thermal runaway at high discharge rates
Solution: Integrated microchannel dielectric liquid cooling with dynamic thermoelectric sensors
Mechanism: Closed-loop Peltier cooling activated when micro-sensors detect localized temperature differentials
Differentiation: Distributed microfluidic channels woven directly between solid electrolyte layers`,
      systemPrompt: 'You are a senior patent attorney and technical analyst. Extract strictly technical concepts into structured JSON.',
      temperature: 0.1,
      maxTokens: 1024,
      jsonSchema: {
        name: 'technical_concepts',
        schema: technicalConceptsJsonSchema,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[Groq Live Test] Request Duration: ${duration} ms`);

    // Strict Zod schema validation
    const parsed = technicalConceptsSchema.safeParse(rawResult);

    if (!parsed.success) {
      console.error('[Groq Live Test] Validation FAILED against technicalConceptsSchema:');
      console.error(JSON.stringify(parsed.error.issues, null, 2));
      process.exit(1);
    }

    console.log('[Groq Live Test] Validation PASS: Output strictly matches technicalConceptsSchema.');
    console.log('[Groq Live Test] Output Preview:');
    console.log(JSON.stringify(parsed.data, null, 2));
    console.log('='.repeat(60));
    console.log('GROQ LIVE SMOKE TEST: SUCCESS');
    console.log('='.repeat(60));
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.log(`[Groq Live Test] Request Duration: ${duration} ms`);
    console.error(`[Groq Live Test] Request failed with error: ${err?.message || err}`);
    // Check if error is quota exhaustion or network
    if (err?.message?.includes('daily quota') || err?.message?.includes('rate_limit_exceeded') || err?.status === 429) {
      console.log('[Groq Live Test] Result: SKIPPED (Daily quota / rate limit reached on Groq account).');
      process.exit(0);
    }
    process.exit(1);
  }
}

runLiveSmokeTest();
