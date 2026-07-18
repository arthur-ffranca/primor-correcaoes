import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getStorageEnv } from "@/lib/env";

export type UploadEssayPageInput = {
  userId: string;
  essayId: string;
  pageOrder: number;
  extension: string;
  contentType: string;
  body: Buffer | Uint8Array;
};

export type StoredEssayPage = {
  key: string;
  mimeType: string;
  pageOrder: number;
};

function createStorageClient() {
  const env = getStorageEnv();

  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export function createEssayUploadKey(input: {
  userId: string;
  essayId: string;
  pageOrder: number;
  extension: string;
}) {
  return `users/${input.userId}/essays/${input.essayId}/page-${input.pageOrder}.${input.extension}`;
}

export async function uploadEssayPage(input: UploadEssayPageInput): Promise<StoredEssayPage> {
  const key = createEssayUploadKey(input);
  const env = getStorageEnv();
  const storageClient = createStorageClient();

  await storageClient.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return {
    key,
    mimeType: input.contentType,
    pageOrder: input.pageOrder,
  };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const env = getStorageEnv();
  const storageClient = createStorageClient();
  const response = await storageClient.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );

  const bytes = await response.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}
