import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { filename, contentType } = await request.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
  }

  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({
      error: 'Missing AWS configuration',
      missing: {
        AWS_REGION: !!region,
        AWS_S3_BUCKET: !!bucket,
        AWS_ACCESS_KEY_ID: !!accessKeyId,
        AWS_SECRET_ACCESS_KEY: !!secretAccessKey,
      },
    }, { status: 500 });
  }

  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

  const key = `uploads/${Date.now()}-${filename}`;
  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 1024 * 1024 * 200],
        ['starts-with', '$Content-Type', ''],
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: 60,
    });
    // Construct the object URL that will be accessible after upload
    const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return NextResponse.json({ url, fields, objectUrl, key });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create presigned POST', details: String(err?.message || err) }, { status: 500 });
  }
}


