import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, pdfUrl } = await request.json();

    if (!title || !pdfUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submission = await prisma.userSubmission.create({
      data: {
        userId: session.user.id,
        title,
        pdfUrl,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ 
      success: true, 
      submission: {
        id: submission.id,
        title: submission.title,
        status: submission.status,
        createdAt: submission.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
