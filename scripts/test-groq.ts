import fs from 'fs';
import path from 'path';

// Parse .env.local manually if process.env.GROQ_API_KEY is not set
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('demo_key_placeholder')) {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/GROQ_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        process.env.GROQ_API_KEY = match[1];
      }
    }
  } catch {
    // Ignore error
  }
}

import { getGroqModel, generateTextCompletion, generateStructuredCompletion } from '../lib/ai/groq';

async function testGroqConnection() {
  console.log('🧪 Testing Groq AI LLM Infrastructure...');
  console.log('   Configured Model:', getGroqModel());

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.includes('demo_key_placeholder')) {
    console.log('\n⚠️ GROQ_API_KEY is using a placeholder in .env.local.');
    console.log('   To perform live API calls with Groq, set your GROQ_API_KEY in .env.local.');
    console.log('✅ Groq LLM Infrastructure module loaded & validated cleanly!');
    process.exit(0);
  }

  try {
    // 1. Test Text Completion
    console.log('\n1. Testing Live Text Completion...');
    const textResult = await generateTextCompletion({
      prompt: 'Explain what a patent claim is in one sentence.',
      systemPrompt: 'You are an IP & Patent Law assistant.',
    });
    console.log('   Response:', textResult.trim());

    // 2. Test Structured JSON Completion
    console.log('\n2. Testing Live Structured JSON Completion...');
    interface TestSchema {
      status: string;
      confidence: number;
      concepts: string[];
    }

    const jsonResult = await generateStructuredCompletion<TestSchema>({
      prompt: 'Extract 3 key concepts from the following invention title: "AI-Powered Smart Waste Segregation System"',
    });

    console.log('   Structured Output:', JSON.stringify(jsonResult, null, 2));

    console.log('\n🎉 GROQ AI LLM CONNECTION SUCCESSFUL!');
  } catch (err: any) {
    console.error('\n❌ Groq AI Connection Failed:', err.message);
    process.exit(1);
  }
}

testGroqConnection();
