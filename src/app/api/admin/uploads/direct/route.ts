import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ensureS3FolderExists } from '@/lib/s3';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: 'Missing AWS envs' }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get('file') as File | null;
  const filename = String(form.get('filename') || '') || 'upload';
  const contentType = String(form.get('contentType') || '') || 'application/octet-stream';
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  // Ensure the uploads folder exists
  await ensureS3FolderExists('uploads/');

  const key = `uploads/${Date.now()}-${filename}`;
  const body = Buffer.from(await file.arrayBuffer());

  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return NextResponse.json({ url, key });
  } catch (err: any) {
    return NextResponse.json({ error: 'Upload failed', details: String(err?.message || err) }, { status: 500 });
  }
}


