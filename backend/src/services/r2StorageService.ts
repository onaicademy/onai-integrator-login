import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Инициализация R2 клиента (S3-совместимый)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'onai-academy-videos';

/**
 * Загрузка видео в Cloudflare R2
 */
export async function uploadVideoToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; key: string }> {
  try {
    const key = `videos/${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await r2Client.send(command);

    const videoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    console.log('✅ Видео загружено в R2:', videoUrl);
    return { url: videoUrl, key };
  } catch (error) {
    console.error('❌ Ошибка загрузки видео в R2:', error);
    throw new Error('Failed to upload video to R2');
  }
}

/**
 * Получение подписанного URL для приватного доступа к видео
 */
export async function getSignedVideoUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('❌ Ошибка получения signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Удаление видео из R2
 */
export async function deleteVideoFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log('✅ Видео удалено из R2:', key);
  } catch (error) {
    console.error('❌ Ошибка удаления видео из R2:', error);
    throw new Error('Failed to delete video from R2');
  }
}

