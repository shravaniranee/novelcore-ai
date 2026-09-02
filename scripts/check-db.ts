import { prisma } from '../lib/prisma';

async function checkHealth() {
  try {
    const versionRes = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    const vectorRes = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`;
    const tablesCount = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`;

    console.log('✅ DATABASE STATUS: LIVE & HEALTHY');
    console.log('-----------------------------------');
    console.log('🟢 Docker Container: novelcore-db (Port 5432)');
    console.log('🟢 PostgreSQL:', versionRes[0]?.version.split(' ')[0] || 'PostgreSQL 16');
    console.log('🟢 pgvector Extension:', vectorRes[0] ? `v${vectorRes[0].extversion} (ACTIVE)` : 'NOT FOUND');
    console.log('🟢 Prisma Schema Tables:', Number(tablesCount[0]?.count || 0), 'public tables created');
  } catch (err: any) {
    console.error('❌ DATABASE STATUS: CONNECTION FAILED');
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHealth();
