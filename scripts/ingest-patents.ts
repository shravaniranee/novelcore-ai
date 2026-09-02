import fs from 'fs';
import path from 'path';

// Parse .env.local manually for CLI execution
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const apiKeyMatch = envContent.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    process.env.OPENAI_API_KEY = apiKeyMatch[1];
  }
}

import { prisma } from '../lib/prisma';
import { searchAndIngestPriorArt, getPatentProvider } from '../lib/patent/service';

async function main() {
  const args = process.argv.slice(2);
  let count = 10;
  let query = 'artificial intelligence';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10) || 10;
    } else if (args[i] === '--query' && args[i + 1]) {
      query = args[i + 1];
    }
  }

  console.log('🚀 NovelCore AI Development Patent Ingestion Tool');
  console.log(`   Target Count: ${count} patents`);
  console.log(`   Search Query: "${query}"`);
  console.log(`   Patent Provider: ${getPatentProvider().name}\n`);

  try {
    const results = await searchAndIngestPriorArt({
      query,
      limit: count,
    });

    console.log(`✅ Ingestion Complete! Processed ${results.length} patent records.\n`);

    console.log('📋 INGESTION RESULTS SUMMARY:');
    console.log('----------------------------------------------------------------');

    results.forEach((res, idx) => {
      console.log(`${idx + 1}. [${res.action.toUpperCase()}] ${res.publicationNumber}`);
      console.log(`   Title: ${res.document.title.substring(0, 70)}...`);
      console.log(`   Source: ${res.document.source}`);
      console.log(`   IPC: ${res.document.ipcCodes.join(', ')}`);
      console.log(`   Embedded: ${res.embedded ? 'YES ✅' : 'NO ❌'} (${res.embeddingModel || 'N/A'}, dim: ${res.embeddingDim || 'N/A'})`);
      console.log('----------------------------------------------------------------');
    });

    console.log('\n🎉 Patent Ingestion & Embedding Pipeline Executed Successfully!');
  } catch (err: any) {
    console.error('❌ Patent Ingestion Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
