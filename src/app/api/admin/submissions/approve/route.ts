import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    // Get submission details
    const submission = await prisma.userSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Submission already processed' },
        { status: 400 }
      );
    }

    const submissionOwner = await prisma.user.findUnique({
      where: { id: submission.userId },
      select: { credits: true },
    });

    if (!submissionOwner) {
      return NextResponse.json({ error: 'Submission owner not found' }, { status: 404 });
    }

    // Create a product from the submission
    const product = await prisma.product.create({
      data: {
        title: submission.title,
        description: `User-contributed study material: ${submission.title}`,
        type: 'PDF',
        fileUrl: submission.pdfUrl,
        isFree: true,
        isActive: true,
      },
    });

    // Update submission status and link to product
    await prisma.userSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        productId: product.id,
      },
    });

    // Credit the user with 1 point (explicit set to avoid Mongo increment issues)
    const updatedCredits = (submissionOwner.credits ?? 0) + 1;
    await prisma.user.update({
      where: { id: submission.userId },
      data: {
        credits: updatedCredits,
      },
    });

    return NextResponse.json({
      success: true,
      productId: product.id,
      message: 'Submission approved and user credited',
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    );
  }
}
