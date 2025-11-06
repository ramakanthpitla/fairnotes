import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: 'S3 not configured' }, { status: 500 });
  }

  try {
    // Extract S3 key from URL
    let s3Key: string;
    if (url.includes('.s3.')) {
      const urlParts = url.split(`.s3.${region}.amazonaws.com/`);
      s3Key = urlParts[1] || urlParts[0].split('/').slice(-1)[0];
    } else {
      s3Key = url;
    }

    const s3 = new S3Client({ 
      region, 
      credentials: { accessKeyId, secretAccessKey } 
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    // Generate presigned URL valid for 1 hour
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Return JSON with presigned URL
    return NextResponse.json({ url: presignedUrl });
  } catch (error: any) {
    console.error('Error generating presigned URL for thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to generate access URL' },
      { status: 500 }
    );
  }
}

