import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadRequestBody {
  filename: string;
  contentType: string;
}

const r2Endpoint = process.env.R2_ACCOUNT_ENDPOINT;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'default-bucket';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UploadRequestBody;
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Both "filename" and "contentType" are required.' },
        { status: 400 }
      );
    }

    if (!r2Endpoint) {
      return NextResponse.json(
        { error: 'R2_ACCOUNT_ENDPOINT environment variable is not configured.' },
        { status: 500 }
      );
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `uploads/${Date.now()}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    // Presigned upload URL valid for 60 seconds
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return NextResponse.json({
      uploadUrl,
      key: objectKey,
    });
  } catch (error: any) {
    console.error('[Cloudflare R2 Presigned URL Error]:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate presigned upload URL.' },
      { status: 500 }
    );
  }
}
