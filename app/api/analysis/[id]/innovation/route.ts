import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getInnovationGapsForAnalysis } from '@/lib/analysis/innovation';

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
        { error: `No patent analysis found for identifier "${trimmedId}".` },
        { status: 404 }
      );
    }

    // 2. Query persisted Innovation Opportunities
    const opportunities = await getInnovationGapsForAnalysis(analysisRun.id);

    // 3. Format response
    const formattedOpportunities = opportunities.map((opp) => ({
      id: opp.id,
      opportunityKey: opp.opportunityKey,
      title: opp.title,
      gapType: opp.gapType,
      impact: opp.impact,
      whyItMatters: opp.whyItMatters,
      expectedImpact: opp.expectedImpact,
      recommendedAction: opp.recommendedAction,
      applied: opp.applied,
      relatedFeatureKeys: opp.relatedFeatureKeys,
      supportingPriorArtIds: opp.supportingPriorArtIds,
      coverage: opp.coverage,
      confidence: opp.confidence,
      differentiationScore: opp.differentiationScore,
      evidenceDetails: opp.evidenceDetails,
      limitations: opp.limitations,
      explanation: opp.explanation,
      explanationProvenance: opp.explanationProvenance,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        analysisMode: analysisRun.analysisMode,
        opportunitiesCount: formattedOpportunities.length,
        opportunities: formattedOpportunities,
        meta: {
          educationalNotice: 'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice.',
          crowdedCount: formattedOpportunities.filter((o) => o.gapType === 'CROWDED').length,
          underservedCount: formattedOpportunities.filter((o) => o.gapType === 'UNDERSERVED').length,
          distinctiveCount: formattedOpportunities.filter((o) => o.gapType === 'POTENTIALLY_DISTINCTIVE').length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Innovation gaps retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving innovation gaps.' },
      { status: 500 }
    );
  }
}
