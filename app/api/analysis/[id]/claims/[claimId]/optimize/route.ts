import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optimizeClaim } from '@/lib/analysis/claims';

export async function POST(
  request: Request,
  { params }: { params: { id: string; claimId: string } }
) {
  try {
    const analysisId = params?.id;
    const claimId = params?.claimId;

    if (!analysisId || !claimId) {
      return NextResponse.json(
        { error: 'Both analysis ID and claim ID are required parameters.' },
        { status: 400 }
      );
    }

    // 1. Resolve AnalysisRun
    let analysisRun = await prisma.analysisRun.findUnique({
      where: { id: analysisId },
    });

    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: analysisId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${analysisId}".` },
        { status: 404 }
      );
    }

    // 2. Parse request body if any
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // 3. Execute Non-destructive Claim Optimization
    const result = await optimizeClaim({
      claimId,
      analysisRunId: analysisRun.id,
      reason: body?.reason,
      narrowingFeatureKey: body?.narrowingFeatureKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to optimize claim.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Claim optimized successfully. New immutable version created.',
        claimId,
        analysisRunId: analysisRun.id,
        newVersion: result.newVersion,
        meta: {
          educationalNotice: 'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice.',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Claim optimization failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while optimizing claim.' },
      { status: 500 }
    );
  }
}
