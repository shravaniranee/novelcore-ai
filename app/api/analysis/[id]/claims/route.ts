import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getClaimsForAnalysis,
  prioritizeClaimFeatures,
  generateDeterministicClaims,
  persistClaimStrategy,
} from '@/lib/analysis/claims';
import {
  FeatureInputForNovelty,
  PriorArtDocMeta,
  MatrixEntryForNovelty,
} from '@/lib/analysis/novelty';

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

    // 2. Query Claims
    const claims = await getClaimsForAnalysis(analysisRun.id, analysisRun.inventionId);

    const formattedClaims = claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      claimType: c.claimType,
      parentClaimNumber: c.parentClaimNumber,
      title: c.title,
      status: c.status,
      versionsCount: c.versions.length,
      latestVersion: c.versions[0] ? {
        id: c.versions[0].id,
        versionNumber: c.versions[0].versionNumber,
        claimText: c.versions[0].claimText,
        isOriginal: c.versions[0].isOriginal,
        isOptimized: c.versions[0].isOptimized,
        source: c.versions[0].source,
        model: c.versions[0].model,
        optimizationReason: c.versions[0].optimizationReason,
        groundedFeatureRatio: c.versions[0].groundedFeatureRatio,
        featureCount: c.versions[0].featureCount,
        groundedFeatureCount: c.versions[0].groundedFeatureCount,
        singleReferenceCoverage: c.versions[0].singleReferenceCoverage,
        collectivePriorArtCoverage: c.versions[0].collectivePriorArtCoverage,
        evidenceConfidence: c.versions[0].evidenceConfidence,
        differentiationScore: c.versions[0].differentiationScore,
        vulnerabilityIndicator: c.versions[0].vulnerabilityIndicator,
        vulnerabilityScore: c.versions[0].vulnerabilityScore,
        priorArtVulnerabilities: c.versions[0].priorArtVulnerabilities,
        createdAt: c.versions[0].createdAt,
        elements: c.versions[0].elements.map((e) => ({
          id: e.id,
          elementKey: e.elementKey,
          text: e.text,
          featureKey: e.featureKey,
          elementType: e.elementType,
          order: e.order,
          inventionFeature: e.inventionFeature ? {
            name: e.inventionFeature.name,
            description: e.inventionFeature.description,
            isNovelty: e.inventionFeature.isNovelty,
          } : null,
        })),
      } : null,
    }));

    return NextResponse.json(
      {
        success: true,
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        claimsCount: formattedClaims.length,
        claims: formattedClaims,
        meta: {
          educationalNotice: 'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice.',
          independentCount: formattedClaims.filter((c) => c.claimType === 'INDEPENDENT').length,
          dependentCount: formattedClaims.filter((c) => c.claimType === 'DEPENDENT').length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Claims retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving claims.' },
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
      include: {
        invention: true,
        inventionFeatures: true,
      },
    });

    if (!analysisRun) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId: trimmedId },
        orderBy: { createdAt: 'desc' },
        include: {
          invention: true,
          inventionFeatures: true,
        },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: `No patent analysis found for identifier "${trimmedId}".` },
        { status: 404 }
      );
    }

    const features: FeatureInputForNovelty[] = analysisRun.inventionFeatures.map((f) => ({
      id: f.id,
      featureKey: f.featureKey,
      name: f.name,
      description: f.description,
      isNovelty: f.isNovelty,
    }));

    if (features.length === 0) {
      return NextResponse.json(
        { error: 'Cannot generate claims: no technical features found for this analysis run.' },
        { status: 400 }
      );
    }

    const matrixEntries = await prisma.featureOverlapMatrixEntry.findMany({
      where: { analysisRunId: analysisRun.id },
    });
    const priorArtDocs = await prisma.priorArtDocument.findMany({
      where: {
        matches: { some: { analysisRunId: analysisRun.id } },
      },
    });

    const matrixInputs: MatrixEntryForNovelty[] = matrixEntries.map((m) => ({
      priorArtDocumentId: m.priorArtDocumentId,
      featureId: m.featureId,
      overlapStatus: m.overlapStatus,
      evidence: m.evidence,
      evidenceSource: m.evidenceSource || 'none',
    }));

    const docInputs: PriorArtDocMeta[] = priorArtDocs.map((d) => ({
      id: d.id,
      publicationNumber: d.publicationNumber,
      title: d.title,
    }));

    const prioritized = prioritizeClaimFeatures(features, matrixInputs, docInputs);
    const deterministicClaims = generateDeterministicClaims(
      analysisRun.invention.title,
      analysisRun.invention.domain,
      prioritized,
      docInputs,
      matrixInputs
    );

    await persistClaimStrategy(
      analysisRun.inventionId,
      analysisRun.id,
      deterministicClaims
    );

    const updatedClaims = await getClaimsForAnalysis(analysisRun.id, analysisRun.inventionId);

    return NextResponse.json(
      {
        success: true,
        analysisRunId: analysisRun.id,
        inventionId: analysisRun.inventionId,
        claimsGenerated: updatedClaims.length,
        claims: updatedClaims,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Claims generation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating claims.' },
      { status: 500 }
    );
  }
}
