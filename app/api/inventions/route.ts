import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/prisma';
import { inventionInputSchema } from '@/lib/validations/invention';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to submit an invention.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = inventionInputSchema.parse(body);

    // Create invention record bound strictly to authenticated user's ID
    const invention = await prisma.invention.create({
      data: {
        userId: user.id,
        title: validatedData.title,
        problem: validatedData.problem,
        solution: validatedData.solution,
        howItWorks: validatedData.howItWorks,
        advantages: validatedData.advantages,
        differentiation: validatedData.differentiation,
        domain: validatedData.domain,
        industry: validatedData.industry,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(
      {
        inventionId: invention.id,
        invention,
        status: invention.status,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while saving the invention.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view inventions.' },
        { status: 401 }
      );
    }

    // Strict tenant isolation: fetch ONLY inventions belonging to the authenticated user
    const inventions = await prisma.invention.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            analysisRuns: true,
            claims: true,
            examinerReviews: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json({ inventions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve inventions.' },
      { status: 500 }
    );
  }
}
