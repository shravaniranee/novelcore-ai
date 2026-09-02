import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getExaminerReviewForAnalysis,
  executeExaminerSimulation,
} from '@/lib/analysis/examiner';

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

    // 1. Resolve AnalysisRun
    let analysisRun = await prisma.analysisRun.findUnique({
      where: { id: trimmedId },
    });

    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: trimmedId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${trimmedId}".` },
        { status: 404 }
      );
    }

    // 2. Query ExaminerReview
    const review = await getExaminerReviewForAnalysis(analysisRun.id, analysisRun.inventionId);

    if (!review) {
      return NextResponse.json(
        {
          error: `No examiner review simulation found for analysis "${analysisRun.id}". Run POST to generate one.`,
          analysisRunId: analysisRun.id,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        examinerReview: {
          id: review.id,
          status: review.status,
          overallRisk: review.overallRisk,
          confidence: review.confidence,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          claimSummaries: review.claimReviews || [],
        },
        findingsCount: review.findings.length,
        findings: review.findings.map((f) => ({
          id: f.id,
          findingType: f.findingType,
          severity: f.severity,
          title: f.title,
          explanation: f.explanation,
          confidence: f.confidence,
          claimNumber: f.claimNumber,
          claimVersionNumber: f.claimVersionNumber,
          claimElementKeys: f.claimElementKeys,
          priorArtDocumentIds: f.priorArtDocumentIds,
          supportingFeatureKeys: f.supportingFeatureKeys,
          evidence: f.evidence,
          recommendation: f.recommendation,
          provenance: f.provenance,
          createdAt: f.createdAt,
        })),
        meta: {
          educationalNotice:
            'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. Examiner simulation is an evidence-based heuristic and is not an actual patent examination or legal opinion.',
          disclaimer:
            'AI-assisted pre-filing examiner review — not a legal opinion or guaranteed statutory determination.',
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

export async function POST(
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

    let analysisRun = await prisma.analysisRun.findUnique({
      where: { id: trimmedId },
    });

    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: trimmedId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${trimmedId}".` },
        { status: 404 }
      );
    }

    // Execute idempotent examiner simulation
    const review = await executeExaminerSimulation(analysisRun.id, analysisRun.inventionId);

    return NextResponse.json(
      {
        success: true,
        message: 'Examiner simulation completed successfully.',
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        examinerReview: {
          id: review.id,
          status: review.status,
          overallRisk: review.overallRisk,
          confidence: review.confidence,
          claimSummaries: review.claimReviews || [],
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
    console.error('[API Error] Examiner review simulation failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while running examiner simulation.' },
      { status: 500 }
    );
  }
}
