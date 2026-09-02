import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/prisma';
import { executeInventionAnalysis } from '@/lib/analysis/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    // Find the latest invention for the user, or default demo invention
    const latestInvention = await prisma.invention.findFirst({
      where: user ? { userId: user.id } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        analysisRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!latestInvention) {
      return NextResponse.json({
        found: false,
        message: 'No analyzed inventions found in database.',
      });
    }

    // If analysisRun exists, re-assemble or generate coherent data
    const analysisResult = await executeInventionAnalysis({
      id: latestInvention.id,
      userId: latestInvention.userId,
      title: latestInvention.title,
      problem: latestInvention.problem,
      solution: latestInvention.solution,
      howItWorks: latestInvention.howItWorks,
      advantages: latestInvention.advantages,
      differentiation: latestInvention.differentiation,
      domain: latestInvention.domain,
      industry: latestInvention.industry,
    });

    return NextResponse.json({
      found: true,
      inventionId: latestInvention.id,
      analysisRunId: analysisResult.analysisRunId,
      invention: {
        title: latestInvention.title,
        problem: latestInvention.problem,
        solution: latestInvention.solution,
        howItWorks: latestInvention.howItWorks,
        advantages: latestInvention.advantages,
        differentiation: latestInvention.differentiation,
        domain: latestInvention.domain,
        industry: latestInvention.industry,
      },
      analysis: analysisResult.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve latest analysis from database.' },
      { status: 500 }
    );
  }
}
