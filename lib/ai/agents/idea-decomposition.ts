import { generateStructuredCompletion } from '@/lib/ai/groq';
import { IDEA_DECOMPOSITION_SYSTEM_PROMPT } from '@/lib/ai/prompts/idea-decomposition';
import { ideaDecompositionSchema, type IdeaDecompositionOutput } from '@/lib/validations/agent-outputs';
import { prisma } from '@/lib/prisma';
import type { InventionInput } from '@/lib/mock-data';

export interface DecomposeIdeaParams {
  inventionId: string;
  input: InventionInput;
}

export interface DecomposeIdeaResponse {
  analysisRunId: string;
  decomposition: IdeaDecompositionOutput;
}

/**
 * Idea Decomposition and IPC Mapping Agent
 * - Formulates prompt from invention fields.
 * - Calls Groq LLM infrastructure for structured analysis.
 * - Validates output strictly with Zod (rejects invalid prose/models).
 * - Creates/updates AnalysisRun record in PostgreSQL bound to Invention.
 */
export async function decomposeIdeaAndMapIPC({
  inventionId,
  input,
}: DecomposeIdeaParams): Promise<DecomposeIdeaResponse> {
  // 1. Verify invention exists in database
  const invention = await prisma.invention.findUnique({
    where: { id: inventionId },
    select: { id: true },
  });

  if (!invention) {
    throw new Error(`Invention not found for ID: ${inventionId}`);
  }

  // 2. Format user prompt from input fields
  const userPrompt = `
Analyze and decompose the following invention submission:

**Title**: ${input.title}
**Domain**: ${input.domain}
**Industry**: ${input.industry}

**Problem Statement**:
${input.problem}

**Proposed Technical Solution**:
${input.solution}

**How It Works (Mechanism)**:
${input.howItWorks}

**Key Advantages**:
${input.advantages}

**Differentiation & Uniqueness**:
${input.differentiation}
`.trim();

  // 3. Call Groq AI LLM infrastructure for structured completion
  const rawOutput = await generateStructuredCompletion<unknown>({
    prompt: userPrompt,
    systemPrompt: IDEA_DECOMPOSITION_SYSTEM_PROMPT,
    temperature: 0.1,
  });

  // 4. Strict Zod validation: reject arbitrary prose or invalid schemas
  let validatedOutput;
  try {
    validatedOutput = ideaDecompositionSchema.parse(rawOutput);
  } catch (parseErr) {
    console.error('Raw Model Output that failed validation:', JSON.stringify(rawOutput, null, 2));
    throw parseErr;
  }

  // 5. Create AnalysisRun database record associating results with Invention
  const analysisRun = await prisma.analysisRun.create({
    data: {
      inventionId,
      status: 'PROCESSING',
      currentStep: 1,
      understanding: validatedOutput.technicalEssence,
      concepts: validatedOutput.coreConcepts,
      ipcCodes: validatedOutput.ipcCodes,
    },
  });

  return {
    analysisRunId: analysisRun.id,
    decomposition: validatedOutput,
  };
}
