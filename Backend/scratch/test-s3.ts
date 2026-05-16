import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testS3() {
  const bucket = process.env.AWS_BUCKET_NAME || 'cv-storage-applyai';
  const region = process.env.AWS_REGION || 'us-east-2';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  console.log('Testing S3 with:', { bucket, region, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey });

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
    },
  });

  try {
    const result = await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'test-upload.txt',
        Body: 'Hello world from test script',
        ContentType: 'text/plain',
      })
    );
    console.log('Upload successful!', result);
  } catch (error: any) {
    console.error('Upload failed:', error.name, error.message, error.Code);
  }
}

testS3();
