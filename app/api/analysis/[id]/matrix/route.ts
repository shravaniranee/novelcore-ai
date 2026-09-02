import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFeatureOverlapMatrixForAnalysis } from '@/lib/analysis/matrix';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const targetId = params?.id;
    if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
      return NextResponse.json(
        { error: 'Valid analysis or invention ID parameter is required.' },
        { status: 400 }
      );
    }

    const trimmedId = targetId.trim();

    // 1. Check if the provided ID is an AnalysisRun ID
    let analysisRun = await prisma.analysisRun.findUnique({
      where: { id: trimmedId },
    });

    // 2. If not an AnalysisRun ID, check if it is an Invention ID
    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: trimmedId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No analysis run found matching ID '${trimmedId}'.` },
        { status: 404 }
      );
    }

    // 3. Assemble complete structured feature overlap matrix
    const matrixView = await getFeatureOverlapMatrixForAnalysis(analysisRun.id);

    if (!matrixView) {
      return NextResponse.json(
        { error: 'Feature overlap matrix could not be assembled.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...matrixView,
    });
  } catch (err: any) {
    console.error('[Matrix API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve feature overlap matrix.' },
      { status: 500 }
    );
  }
}
