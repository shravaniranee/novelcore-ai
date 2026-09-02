import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const match = envContent.match(/GROQ_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match && match[1]) {
    process.env.GROQ_API_KEY = match[1];
  }
}

async function listModels() {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const models = await groq.models.list();
    console.log('AVAILABLE GROQ MODELS:');
    models.data.forEach((m) => console.log(' -', m.id));
  } catch (err: any) {
    console.error('Error listing models:', err.message);
  }
}

listModels();
