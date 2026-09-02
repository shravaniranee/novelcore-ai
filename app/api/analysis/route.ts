import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/prisma';
import { executeInventionAnalysis } from '@/lib/analysis/engine';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload. A valid request body is required.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body format. An object is required.' },
        { status: 400 }
      );
    }

    let inventionData = body;
    if (body.inventionId) {
      if (typeof body.inventionId !== 'string' || !body.inventionId.trim()) {
        return NextResponse.json(
          { error: 'Invalid inventionId format.' },
          { status: 400 }
        );
      }

      const inv = await prisma.invention.findUnique({
        where: { id: body.inventionId.trim() },
      });
      if (!inv) {
        return NextResponse.json(
          { error: `Invention not found for ID '${body.inventionId}'.` },
          { status: 404 }
        );
      }
      inventionData = {
        id: inv.id,
        userId: inv.userId,
        title: inv.title,
        problem: inv.problem,
        solution: inv.solution,
        howItWorks: inv.howItWorks,
        advantages: inv.advantages,
        differentiation: inv.differentiation,
        domain: inv.domain,
        industry: inv.industry,
      };
    } else {
      // Direct invention analysis input
      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json(
          { error: 'Validation failed: Invention title is required.' },
          { status: 400 }
        );
      }
      if (!body.problem || typeof body.problem !== 'string' || !body.problem.trim()) {
        return NextResponse.json(
          { error: 'Validation failed: Problem statement is required.' },
          { status: 400 }
        );
      }
      if (!body.solution || typeof body.solution !== 'string' || !body.solution.trim()) {
        return NextResponse.json(
          { error: 'Validation failed: Solution description is required.' },
          { status: 400 }
        );
      }
    }

    const result = await executeInventionAnalysis({
      ...inventionData,
      userId: user?.id || inventionData.userId,
    });

    return NextResponse.json({
      success: true,
      analysisRunId: result.analysisRunId,
      inventionId: result.inventionId,
      analysis: result.data,
    });
  } catch (err: any) {
    // Return clean user-facing message without internal stack traces
    return NextResponse.json(
      { error: err.message || 'Analysis processing encountered an unexpected error.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const inventionId = searchParams.get('inventionId');

    if (!id && !inventionId) {
      return NextResponse.json(
        { error: 'Query parameter "id" or "inventionId" is required.' },
        { status: 400 }
      );
    }

    let analysisRun = null;
    if (id) {
      analysisRun = await prisma.analysisRun.findUnique({
        where: { id },
        include: {
          priorArtMatches: {
            include: { document: true },
            orderBy: { ranking: 'asc' },
          },
          opportunities: true,
          invention: true,
        },
      });
    } else if (inventionId) {
      analysisRun = await prisma.analysisRun.findFirst({
        where: { inventionId },
        orderBy: { createdAt: 'desc' },
        include: {
          priorArtMatches: {
            include: { document: true },
            orderBy: { ranking: 'asc' },
          },
          opportunities: true,
          invention: true,
        },
      });
    }

    if (!analysisRun) {
      return NextResponse.json(
        { error: 'Analysis record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysisRun,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve analysis.' },
      { status: 500 }
    );
  }
}
