import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  executeUnifiedReportGeneration,
  getReportForAnalysis,
} from '@/lib/report/generator';

async function resolveAnalysisRun(targetId: string) {
  let analysisRun = await prisma.analysisRun.findUnique({
    where: { id: targetId },
  });

  if (!analysisRun) {
    analysisRun = await prisma.analysisRun.findFirst({
      where: { inventionId: targetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  return analysisRun;
}

function sanitizeErrorMessage(error: any): string {
  const raw = error?.message || 'Internal server error while processing report.';
  return String(raw)
    .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED]')
    .replace(/DATABASE_URL=[^\s]+/gi, 'DATABASE_URL=[REDACTED]')
    .replace(/GROQ_API_KEY=[^\s]+/gi, 'GROQ_API_KEY=[REDACTED]')
    .replace(/OPENAI_API_KEY=[^\s]+/gi, 'OPENAI_API_KEY=[REDACTED]');
}

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

    const analysisRun = await resolveAnalysisRun(targetId.trim());
    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${targetId.trim()}".` },
        { status: 404 }
      );
    }

    const report = await getReportForAnalysis(analysisRun.id);
    if (!report || report.status !== 'COMPLETED' || !report.sectionsSnapshot) {
      return NextResponse.json(
        {
          error: 'Unified report has not been generated yet.',
          analysisRunId: analysisRun.id,
          generated: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        generated: true,
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        report: {
          id: report.id,
          title: report.title,
          status: report.status,
          reportVersion: report.reportVersion,
          executiveSummary: report.executiveSummary,
          overallAssessment: report.overallAssessment,
          finalRecommendation: report.finalRecommendation,
          recommendationReason: report.recommendationReason,
          sections: report.sectionsSnapshot,
          evidenceSources: report.evidenceSources,
          evidence: (report as any).evidence || [],
          provenance: report.provenance,
          disclaimer: report.disclaimer,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Report retrieval failed:', sanitizeErrorMessage(error));
    return NextResponse.json(
      { error: 'Internal server error while retrieving unified report.' },
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

    const analysisRun = await resolveAnalysisRun(targetId.trim());
    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${targetId.trim()}".` },
        { status: 404 }
      );
    }

    const { report } = await executeUnifiedReportGeneration(analysisRun.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Unified patent intelligence report generated successfully.',
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        report: {
          id: report.id,
          title: report.title,
          status: report.status,
          reportVersion: report.reportVersion,
          executiveSummary: report.executiveSummary,
          overallAssessment: report.overallAssessment,
          finalRecommendation: report.finalRecommendation,
          recommendationReason: report.recommendationReason,
          sections: report.sectionsSnapshot,
          evidenceSources: report.evidenceSources,
          evidence: (report as any).evidence || [],
          provenance: report.provenance,
          disclaimer: report.disclaimer,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Report generation failed:', sanitizeErrorMessage(error));
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
