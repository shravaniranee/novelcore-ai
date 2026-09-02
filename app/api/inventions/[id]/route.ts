import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/prisma';
import { inventionUpdateSchema } from '@/lib/validations/invention';
import { ZodError } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    const invention = await prisma.invention.findUnique({
      where: { id },
      include: {
        analysisRuns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        claims: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
            },
          },
          orderBy: { claimNumber: 'asc' },
        },
        examinerReviews: {
          orderBy: { createdAt: 'desc' },
        },
        opportunities: {
          orderBy: { createdAt: 'desc' },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invention) {
      return NextResponse.json(
        { error: 'Invention not found.' },
        { status: 404 }
      );
    }

    // Security: Ensure user can ONLY access their own invention
    if (invention.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. Access denied to this invention.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ invention });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invention details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    const existingInvention = await prisma.invention.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingInvention) {
      return NextResponse.json(
        { error: 'Invention not found.' },
        { status: 404 }
      );
    }

    if (existingInvention.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. Access denied to this invention.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = inventionUpdateSchema.parse(body);

    const updatedInvention = await prisma.invention.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      invention: updatedInvention,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to update invention.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    const existingInvention = await prisma.invention.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingInvention) {
      return NextResponse.json(
        { error: 'Invention not found.' },
        { status: 404 }
      );
    }

    if (existingInvention.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. Access denied to this invention.' },
        { status: 403 }
      );
    }

    await prisma.invention.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Invention deleted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete invention.' },
      { status: 500 }
    );
  }
}
