import { NextResponse } from 'next/server';
import { getReportById } from '@/lib/report/generator';

function sanitizeErrorMessage(error: any): string {
  const raw = error?.message || 'Internal server error while retrieving report.';
  return String(raw)
    .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED]')
    .replace(/DATABASE_URL=[^\s]+/gi, 'DATABASE_URL=[REDACTED]')
    .replace(/GROQ_API_KEY=[^\s]+/gi, 'GROQ_API_KEY=[REDACTED]')
    .replace(/OPENAI_API_KEY=[^\s]+/gi, 'OPENAI_API_KEY=[REDACTED]');
}

export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const reportId = params?.reportId;
    if (!reportId || typeof reportId !== 'string' || !reportId.trim()) {
      return NextResponse.json(
        { error: 'Valid report ID parameter is required.' },
        { status: 400 }
      );
    }

    const report = await getReportById(reportId.trim());
    if (!report) {
      return NextResponse.json(
        { error: `Report with ID "${reportId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        report: {
          id: report.id,
          analysisRunId: report.analysisRunId,
          inventionId: report.inventionId,
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
    console.error('[API Error] Report by ID retrieval failed:', sanitizeErrorMessage(error));
    return NextResponse.json(
      { error: 'Internal server error while retrieving report.' },
      { status: 500 }
    );
  }
}
