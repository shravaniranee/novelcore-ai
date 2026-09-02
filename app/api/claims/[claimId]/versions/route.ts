import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { claimId: string } }
) {
  try {
    const claimId = params?.claimId;
    if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
      return NextResponse.json(
        { error: 'Valid claim ID parameter is required.' },
        { status: 400 }
      );
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId.trim() },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            elements: {
              orderBy: { order: 'asc' },
              include: {
                inventionFeature: true,
              },
            },
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: `No patent claim found with ID "${claimId}".` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        title: claim.title,
        status: claim.status,
        versionsCount: claim.versions.length,
        versions: claim.versions,
        meta: {
          educationalNotice: 'NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice.',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Error] Claim versions retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving claim versions.' },
      { status: 500 }
    );
  }
}
