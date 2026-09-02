import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const match = envContent.match(/GROQ_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match && match[1]) {
    process.env.GROQ_API_KEY = match[1];
  }
}

import { generateStructuredCompletion } from '../lib/ai/groq';
import { IDEA_DECOMPOSITION_SYSTEM_PROMPT } from '../lib/ai/prompts/idea-decomposition';
import { ideaDecompositionSchema } from '../lib/validations/agent-outputs';

const modelsToTest = [
  'groq/compound-mini',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'groq/compound',
];

const samplePrompt = `
Title: Smart Waste Segregation System
Problem: Waste sorting is labor intensive.
Solution: Camera and NIR sensor fusion.
How It Works: Camera identifies shape, NIR identifies resin type.
Advantages: High speed sorting.
Differentiation: Dual sensor fusion.
Domain: Computer Vision
Industry: Recycling
`;

async function testAllModels() {
  for (const model of modelsToTest) {
    console.log(`\nTesting "${model}" with full decomposition prompt...`);
    try {
      const raw = await generateStructuredCompletion({
        model,
        prompt: samplePrompt,
        systemPrompt: IDEA_DECOMPOSITION_SYSTEM_PROMPT,
      });
      const parsed = ideaDecompositionSchema.parse(raw);
      console.log(`✅ SUCCESS for "${model}":`);
      console.log('   Essence:', parsed.technicalEssence.substring(0, 80));
      console.log('   IPC:', parsed.ipcCodes);
    } catch (err: any) {
      console.error(`❌ FAILED for "${model}":`, err.message);
    }
  }
}

testAllModels();
