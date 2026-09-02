import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getNoveltyAssessmentForAnalysis,
  calculateDeterministicNovelty,
  persistNoveltyAssessment,
  FeatureInputForNovelty,
  MatrixEntryForNovelty,
  PriorArtDocMeta,
} from '@/lib/analysis/novelty';
import { OverlapStatus } from '@prisma/client';

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
      include: {
        invention: true,
      },
    });

    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: trimmedId },
        orderBy: { createdAt: 'desc' },
        include: {
          invention: true,
        },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No analysis run found matching ID '${trimmedId}'.` },
        { status: 404 }
      );
    }

    // 2. Fetch existing NoveltyAssessment
    let assessment = await getNoveltyAssessmentForAnalysis(analysisRun.id);

    // 3. If assessment not found in DB, compute from persisted matrix and features
    if (!assessment) {
      const features = await prisma.inventionFeature.findMany({
        where: { analysisRunId: analysisRun.id },
        orderBy: { order: 'asc' },
      });

      const matrixEntries = await prisma.featureOverlapMatrixEntry.findMany({
        where: { analysisRunId: analysisRun.id },
      });

      const priorArtMatches = await prisma.priorArtMatch.findMany({
        where: { analysisRunId: analysisRun.id },
        include: { document: true },
        orderBy: { ranking: 'asc' },
      });

      if (features.length > 0 && matrixEntries.length > 0) {
        const featureInputs: FeatureInputForNovelty[] = features.map((f) => ({
          id: f.id,
          featureKey: f.featureKey,
          name: f.name,
          isNovelty: f.isNovelty,
        }));

        const priorArtDocs: PriorArtDocMeta[] = priorArtMatches.map((m) => ({
          id: m.document.id,
          publicationNumber: m.document.publicationNumber,
          title: m.document.title,
        }));

        const matrixInputs: MatrixEntryForNovelty[] = matrixEntries.map((m) => ({
          priorArtDocumentId: m.priorArtDocumentId,
          featureId: m.featureId,
          overlapStatus: m.overlapStatus as OverlapStatus,
          evidence: m.evidence,
          evidenceSource: m.evidenceSource,
          explanation: m.explanation,
          featureName: m.featureName,
        }));

        const computed = calculateDeterministicNovelty(
          featureInputs,
          matrixInputs,
          priorArtDocs
        );

        await persistNoveltyAssessment(analysisRun.id, computed);
        assessment = await getNoveltyAssessmentForAnalysis(analysisRun.id);
      }
    }

    if (!assessment) {
      return NextResponse.json(
        { error: 'Novelty assessment data is not available for this analysis.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysisRunId: analysisRun.id,
      inventionId: analysisRun.inventionId,
      analysisMode: analysisRun.analysisMode,
      assessment: {
        id: assessment.id,
        noveltyScore: assessment.noveltyScore,
        noveltyBand: assessment.noveltyBand,
        evidenceConfidence: assessment.evidenceConfidence,
        singleReferenceRisk: assessment.singleReferenceRisk,
        collectiveCoverage: assessment.collectiveCoverage,
        patentabilityRisk: assessment.patentabilityRisk,
        scoringBreakdown: assessment.scoringBreakdown,
        evidenceReferences: assessment.evidenceReferences,
        groqExplanation: assessment.groqExplanation,
        createdAt: assessment.createdAt,
        referenceAssessments: assessment.referenceAssessments.map((r) => ({
          id: r.id,
          priorArtDocumentId: r.priorArtDocumentId,
          publicationNumber: r.priorArtDocument.publicationNumber,
          title: r.priorArtDocument.title,
          disclosedFeatureCount: r.disclosedFeatureCount,
          partialFeatureCount: r.partialFeatureCount,
          notDisclosedFeatureCount: r.notDisclosedFeatureCount,
          insufficientEvidenceCount: r.insufficientEvidenceCount,
          coverageRatio: r.coverageRatio,
          evidenceConfidence: r.evidenceConfidence,
          anticipationRisk: r.anticipationRisk,
          evidenceDetails: r.evidenceDetails,
        })),
      },
    });
  } catch (err: any) {
    console.error('[Novelty API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve novelty assessment.' },
      { status: 500 }
    );
  }
}
