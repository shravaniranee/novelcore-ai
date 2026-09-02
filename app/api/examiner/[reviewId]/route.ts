import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params?.reviewId;
    if (!reviewId || typeof reviewId !== 'string' || !reviewId.trim()) {
      return NextResponse.json(
        { error: 'Valid review ID parameter is required.' },
        { status: 400 }
      );
    }

    const review = await prisma.examinerReview.findUnique({
      where: { id: reviewId.trim() },
      include: {
        findings: {
          orderBy: [{ claimNumber: 'asc' }, { severity: 'desc' }],
        },
        analysisRun: true,
        invention: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: `Examiner review with ID "${reviewId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        examinerReview: {
          id: review.id,
          analysisRunId: review.analysisRunId,
          inventionId: review.inventionId,
          status: review.status,
          overallRisk: review.overallRisk,
          confidence: review.confidence,
          claimSummaries: review.claimReviews || [],
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        },
        findingsCount: review.findings.length,
        findings: review.findings,
        meta: {
          educationalNotice:
            'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. Examiner simulation is an evidence-based heuristic and is not an actual patent examination or legal opinion.',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Examiner review retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving examiner review.' },
      { status: 500 }
    );
  }
}
