import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Delete a file from S3 bucket
 * @param fileUrl - Full S3 URL or just the key
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteFileFromS3(fileUrl: string): Promise<boolean> {
  try {
    const bucket = process.env.AWS_S3_BUCKET!;
    let key = fileUrl;

    // Extract pathname
    if (fileUrl.startsWith('http')) {
      const url = new URL(fileUrl);
      key = url.pathname.replace(/^\/+/, '');

      // Remove bucket name if present
      if (key.startsWith(bucket + '/')) {
        key = key.substring(bucket.length + 1);
      }
    }

    // Decode URL-encoded characters
    key = decodeURIComponent(key);

    console.log('FINAL S3 KEY:', key);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    console.log('S3 DELETE SUCCESS:', key);
    return true;
  } catch (err) {
    console.error('S3 DELETE ERROR:', err);
    return false;
  }
}

/**
 * Delete multiple files from S3 bucket
 * @param fileUrls - Array of S3 URLs or keys
 * @returns Promise<{ success: number, failed: number }>
 */
export async function deleteFilesFromS3(fileUrls: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    fileUrls.filter(url => url).map(url => deleteFileFromS3(url))
  );

  const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - success;

  return { success, failed };
}
