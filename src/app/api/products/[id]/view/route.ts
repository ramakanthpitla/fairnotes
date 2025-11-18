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

    const session = await getServerSession(authOptions as any) as { user?: any };
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const now = new Date();
    let hasAccess = product.isFree;

    if (!hasAccess) {
      const validPurchase = await prisma.purchase.findFirst({
        where: {
          userId: session.user.id,
          productId: product.id,
          status: 'COMPLETED',
          expiresAt: {
            gte: now,
          },
        },
      });

      if (validPurchase) {
        hasAccess = true;
      } else {
        const creditAccess = await prisma.creditUsage.findFirst({
          where: {
            userId: session.user.id,
            productId: product.id,
            isActive: true,
            expiresAt: {
              gte: now,
            },
          },
          orderBy: {
            expiresAt: 'desc',
          },
        });

        hasAccess = !!creditAccess;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You need to purchase this product to access it' },
        { status: 403 }
      );
    }

    // Get the file URL
    const fileUrl = product.fileUrl;
    
    // If we don't have a file URL, we can't proceed
    if (!fileUrl) {
      return NextResponse.json(
        { error: 'No file URL available for this product' },
        { status: 404 }
      );
    }
    
    // If it's a direct HTTP/HTTPS URL, check if we need to add CORS proxy or convert to public URL
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // For S3 URLs, ensure they're in the correct format for public access
      if (fileUrl.includes('.s3.') || fileUrl.includes('.amazonaws.com')) {
        // Try to extract bucket and key from URL
        let s3Url = fileUrl;
        
        // If URL has query parameters or fragments that might cause issues, clean it
        try {
          const urlObj = new URL(fileUrl);
          // Reconstruct clean S3 URL without auth parameters
          if (urlObj.hostname.includes('.s3.')) {
            const bucket = urlObj.hostname.split('.s3.')[0];
            const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
            const region = process.env.AWS_REGION || 'ap-south-2';
            // Use path-style URL which is more reliable
            s3Url = `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
          }
        } catch (e) {
          console.warn('Failed to parse S3 URL, using as-is:', e);
        }
        
        console.log('Returning S3 URL:', s3Url);
        return NextResponse.json({ url: s3Url });
      }
      return NextResponse.json({ url: fileUrl });
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

      console.log('Generated presigned URL:', presignedUrl);
      return NextResponse.json({ url: presignedUrl });
      
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

