import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ensureS3FolderExists } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string };
    };
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Verify it's a PDF
    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        {
          error: 'AWS configuration is missing on the server',
          details: 'Please contact administrator',
        },
        { status: 500 }
      );
    }

    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Ensure the user-submissions folder exists
    await ensureS3FolderExists('user-submissions/');

    // Generate unique key for the upload
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `user-submissions/${userId}/${timestamp}-${sanitizedFileName}`;

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      url,
      key,
      bucket,
      publicUrl,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
