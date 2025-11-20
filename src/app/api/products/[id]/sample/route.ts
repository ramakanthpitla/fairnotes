import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument } from 'pdf-lib';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { recordProductView } from '@/lib/product-view-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PREVIEW_PERCENTAGE = 5;
const MAX_PREVIEW_PAGES = 3;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || id.trim() === '') {
      console.error('[sample] Missing or invalid product id');
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    const url = new URL(request.url);
    const previewParam = url.searchParams.get('previewPercentage');
    const previewPercentage = sanitizePreviewPercentage(previewParam);

    console.log('[sample] request received', { id, previewPercentage });

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        fileUrl: true,
        type: true,
        isActive: true,
      },
    });

    if (!product) {
      console.warn('[sample] product not found', { id });
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      console.warn('[sample] product is inactive', { id });
      return NextResponse.json(
        { error: 'Product is not available' },
        { status: 404 }
      );
    }

    if (product.type !== 'PDF') {
      console.warn('[sample] product is not a PDF', { id, type: product.type });
      return NextResponse.json(
        { error: 'This product type does not support preview' },
        { status: 400 }
      );
    }

    if (!product.fileUrl) {
      console.warn('[sample] product has no file URL', { id });
      return NextResponse.json(
        { error: 'Sample preview is unavailable for this product' },
        { status: 404 }
      );
    }

    const session = await getServerSession(authOptions as any) as { user?: { id?: string } } | null;
    if (session?.user?.id) {
      await recordProductView(session.user.id, id, 'SAMPLE');
    }

    console.log('[sample] loading source pdf', { fileUrl: product.fileUrl });
    const pdfBuffer = await loadPdfBuffer(product.fileUrl);
    console.log('[sample] pdf bytes', pdfBuffer.length);
    const sourceDocument = await PDFDocument.load(pdfBuffer);
    const totalPages = sourceDocument.getPageCount();

    if (totalPages <= 0) {
      console.warn('[sample] pdf has no pages', { id });
      return NextResponse.json(
        { error: 'Source PDF does not contain any pages' },
        { status: 422 }
      );
    }

    const percentagePages = Math.max(1, Math.ceil((previewPercentage / 100) * totalPages));
    const pagesToInclude = Math.min(MAX_PREVIEW_PAGES, percentagePages, totalPages);

    console.log('[sample] creating preview', { totalPages, pagesToInclude });
    const previewDocument = await PDFDocument.create();
    const copiedPages = await previewDocument.copyPages(
      sourceDocument,
      Array.from({ length: pagesToInclude }, (_, index) => index)
    );

    copiedPages.forEach((page) => previewDocument.addPage(page));

    const previewBytes = await previewDocument.save();
    console.log('[sample] preview generated', { previewBytes: previewBytes.length });

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Length': previewBytes.length.toString(),
      'Cache-Control': 'public, max-age=3600, immutable',
      'X-Total-Pages': totalPages.toString(),
      'X-Preview-Pages': pagesToInclude.toString(),
      'Access-Control-Expose-Headers': 'X-Total-Pages, X-Preview-Pages',
    });

    return new NextResponse(Buffer.from(previewBytes), { status: 200, headers });
  } catch (error) {
    console.error('Error generating sample preview:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      {
        error: 'Failed to generate sample preview',
        details: message,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    );
  }
}

function sanitizePreviewPercentage(value: string | null): number {
  if (!value) {
    return DEFAULT_PREVIEW_PERCENTAGE;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_PREVIEW_PERCENTAGE;
  }

  return Math.min(50, Math.max(1, parsed));
}

async function loadPdfBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const s3Details = extractS3Details(fileUrl);
    if (s3Details) {
      return fetchFromS3(s3Details.bucket, s3Details.key);
    }

    const response = await fetch(fileUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL (${response.status} ${response.statusText})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }

  const key = fileUrl.replace(/^\/+/, '');
  return fetchFromS3(bucket, key);
}

async function fetchFromS3(bucket: string, key: string): Promise<Buffer> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-2';
  // Don't double-encode - S3 keys from the database may already be encoded
  const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  if (!accessKeyId || !secretAccessKey) {
    console.warn('[sample] AWS credentials missing, attempting direct HTTPS fetch');
    return fetchDirect(directUrl);
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 3,
  });

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);

    const body = response.Body;

    if (!body) {
      throw new Error('Empty response body received from S3');
    }

    if (typeof (body as any).transformToByteArray === 'function') {
      const bytes = await (body as any).transformToByteArray();
      return Buffer.from(bytes);
    }

    const chunks: Uint8Array[] = [];
    const reader = body as unknown as AsyncIterable<Uint8Array>;

    for await (const chunk of reader) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.warn('[sample] S3 client fetch failed, falling back to direct HTTPS', error);
    return fetchDirect(directUrl);
  }
}

async function fetchDirect(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed direct fetch from ${url} (${response.status} ${response.statusText})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function extractS3Details(fileUrl: string): { bucket: string; key: string } | null {
  try {
    const url = new URL(fileUrl);

    if (url.hostname.includes('.s3.')) {
      const [bucket] = url.hostname.split('.s3.');
      const key = url.pathname.replace(/^\/+/, '');
      return { bucket, key };
    }

    if (url.hostname === 's3.amazonaws.com') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const [bucket, ...keySegments] = segments;
        return { bucket, key: keySegments.join('/') };
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse S3 URL, treating as direct HTTP URL', error);
    return null;
  }
}
