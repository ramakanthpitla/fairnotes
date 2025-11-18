import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { deleteFileFromS3 } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { submissionId, reason } = await request.json();

    if (!submissionId || !reason) {
      return NextResponse.json(
        { error: 'Submission ID and reason are required' },
        { status: 400 }
      );
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

    // Update submission status with admin notes
    await prisma.userSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        adminNotes: reason,
      },
    });

    // Delete the PDF from S3
    if (submission.pdfUrl) {
      await deleteFileFromS3(submission.pdfUrl).catch((err) => {
        console.error('Failed to delete rejected submission from S3:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Submission rejected and deleted from S3',
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    return NextResponse.json(
      { error: 'Failed to reject submission' },
      { status: 500 }
    );
  }
}
