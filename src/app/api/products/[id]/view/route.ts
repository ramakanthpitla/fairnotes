import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get product
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // For free products, anyone can access. For paid, check purchase.
    // For now, allow all active products to be accessed
    const session = await getServerSession(authOptions as any) as { user?: any };
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // TODO: Check if user has purchased this product if it's not free
    // For now, we're allowing access to all authenticated users

    // First, try to use the file URL directly if it's a direct HTTP/HTTPS URL
    const fileUrl = product.fileUrl;
    
    // If it's a direct HTTP/HTTPS URL, return it directly
    if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
      return NextResponse.json({ url: fileUrl });
    }

    // If we don't have a file URL, we can't proceed
    if (!fileUrl) {
      return NextResponse.json(
        { error: 'No file URL available for this product' },
        { status: 404 }
      );
    }

    // Try to generate a presigned URL for S3 if credentials are available
    const region = process.env.AWS_REGION || 'ap-south-2'; // Default to ap-south-2 based on your bucket
    const bucket = process.env.AWS_S3_BUCKET || 'studymaterials-bucket'; // Your bucket name
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // If S3 is not configured, try to use the file URL directly if it exists
    if (!accessKeyId || !secretAccessKey) {
      console.warn('S3 credentials not configured, falling back to direct file URL');
      // If fileUrl is already a direct URL, use it
      if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        return NextResponse.json({ url: fileUrl });
      }
      // Otherwise, construct a direct URL
      const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(fileUrl)}`;
      return NextResponse.json({ url: directUrl });
    }

    try {
      // Extract S3 key from URL
      let s3Key: string;
      
      if (fileUrl.includes('.s3.')) {
        // Extract key from S3 URL: https://bucket.s3.region.amazonaws.com/key
        const urlParts = fileUrl.split(`.s3.${region}.amazonaws.com/`);
        s3Key = urlParts[1] || urlParts[0].split('/').slice(-1)[0];
      } else {
        // Assume it's already a key
        s3Key = fileUrl;
      }

      // Remove any leading slashes from the key
      s3Key = s3Key.replace(/^\/+/, '');

      console.log('Generating presigned URL for:', { bucket, region, s3Key });

      const s3 = new S3Client({ 
        region, 
        credentials: { accessKeyId, secretAccessKey },
        // Add retry configuration
        maxAttempts: 3,
        retryMode: 'standard',
      });

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        // Explicitly set the response content type for PDFs
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: 'inline; filename="document.pdf"',
      });

      // Generate presigned URL valid for 1 hour
      const presignedUrl = await getSignedUrl(s3, command, { 
        expiresIn: 3600,
      });
      
      // Force path-style URL if needed
      let finalUrl = presignedUrl;
      if (presignedUrl.includes('amazonaws.com/') && !presignedUrl.includes('s3.amazonaws.com/')) {
        finalUrl = presignedUrl.replace('s3.', 's3-accelerate.');
      }

      console.log('Generated presigned URL:', finalUrl);
      return NextResponse.json({ url: finalUrl });
      
    } catch (s3Error: any) {
      console.error('S3 Error:', s3Error);
      
      // If we get an access denied error, try to use the direct URL as fallback
      if (s3Error.name === 'AccessDenied' || s3Error.name === 'Forbidden' || 
          s3Error.message.includes('AccessDenied') || 
          s3Error.message.includes('Forbidden') ||
          s3Error.message.includes('The AWS Access Key Id you provided does not exist') ||
          s3Error.message.includes('The request signature we calculated does not match the signature you provided')) {
        
        console.warn('S3 access denied, falling back to direct URL');
        
        // If the file URL looks like a direct URL, use it
        if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
          return NextResponse.json({ url: fileUrl });
        }
        
        // Otherwise, try to construct a direct URL from the S3 key
        const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(fileUrl)}`;
        console.log('Using direct URL as fallback:', directUrl);
        return NextResponse.json({ url: directUrl });
      }
      
      // For other S3 errors, return a more helpful error message
      return NextResponse.json(
        { 
          error: 'Failed to access file',
          details: s3Error.message || 'Unknown S3 error',
          code: s3Error.code || 'S3_ERROR',
          suggestion: 'Check your S3 bucket policy and CORS configuration.'
        }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate access URL', details: error?.message },
      { status: 500 }
    );
  }
}

