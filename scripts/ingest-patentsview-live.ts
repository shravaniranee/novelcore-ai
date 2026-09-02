import fs from 'fs';
import path from 'path';

// Parse .env.local manually for CLI execution
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const apiKeyMatch = envContent.match(/PATENTSVIEW_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    process.env.PATENTSVIEW_API_KEY = apiKeyMatch[1];
  }
}

import { prisma } from '../lib/prisma';
import { PatentsViewProvider } from '../lib/patent/providers/patentsview';
import { searchAndIngestPriorArt } from '../lib/patent/service';

async function ingestLivePatentsViewData() {
  const args = process.argv.slice(2);
  let count = 10;
  let query = 'artificial intelligence';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = Math.min(parseInt(args[i + 1], 10) || 10, 20); // Cap at 20 max for safety
    } else if (args[i] === '--query' && args[i + 1]) {
      query = args[i + 1];
    }
  }

  console.log('🚀 NovelCore AI Live PatentsView Ingestion CLI Tool');
  console.log(`   Target Count: ${count} real patents (max limit: 20)`);
  console.log(`   Search Query: "${query}"`);
  console.log(`   Endpoint: https://api.patentsview.org/patents/query\n`);

  const provider = new PatentsViewProvider();

  try {
    const results = await searchAndIngestPriorArt(
      {
        query,
        limit: count,
      },
      provider
    );

    console.log(`✅ Ingestion Complete! Processed ${results.length} real patent records from PatentsView.\n`);

    console.log('----------------------------------------------------------------');
    console.log('📜 LIVE PATENTSVIEW INGESTION RESULTS:');
    console.log('----------------------------------------------------------------');

    results.forEach((res, idx) => {
      console.log(`${idx + 1}. [${res.action.toUpperCase()}] ${res.publicationNumber}`);
      console.log(`   Title: ${res.document.title.substring(0, 75)}...`);
      console.log(`   Source: ${res.document.source} (URL: ${res.document.url || 'N/A'})`);
      console.log(`   IPC: ${res.document.ipcCodes.slice(0, 3).join(', ')}`);
      console.log(`   Inventors: ${res.document.inventors.slice(0, 2).join(', ')}`);
      console.log(`   Applicants/Assignees: ${res.document.applicants.slice(0, 2).join(', ')}`);
      console.log(`   Embedded: ${res.embedded ? 'YES ✅' : 'NO ❌'} (${res.embeddingModel || 'N/A'}, dim: ${res.embeddingDim || 'N/A'})`);
      console.log('----------------------------------------------------------------');
    });

    console.log('\n🎉 Live PatentsView Patent Ingestion & Embedding Pipeline Succeeded!');
  } catch (err: any) {
    console.error('❌ PatentsView Live Ingestion Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ingestLivePatentsViewData();
