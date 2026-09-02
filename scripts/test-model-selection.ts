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

const candidateModels = [
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-20b',
  'groq/compound-mini',
];

async function testCandidateModels() {
  console.log('🧪 Testing Candidate Groq Models for Stability & Token Size...\n');

  for (const model of candidateModels) {
    console.log(`Testing model: "${model}"...`);
    try {
      const start = Date.now();
      const res = await generateStructuredCompletion<{ answer: string; keywords: string[] }>({
        model,
        prompt: 'Decompose the invention title "Smart Water Purification System" into keywords.',
        maxTokens: 512,
      });
      const elapsed = Date.now() - start;
      console.log(`✅ SUCCESS (${elapsed}ms):`, JSON.stringify(res));
    } catch (err: any) {
      console.error(`❌ FAILED for "${model}":`, err.message);
    }
  }
}

testCandidateModels();
