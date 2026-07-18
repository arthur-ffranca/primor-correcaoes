import { z } from "zod";

const storageEnvSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});

const maritacaEnvSchema = z.object({
  MARITACA_API_KEY: z.string().min(1),
  MARITACA_MODEL: z.string().min(1).default("sabia-4"),
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  ...storageEnvSchema.shape,
  ...maritacaEnvSchema.shape,
});

export type AppEnv = z.infer<typeof envSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;
export type MaritacaEnv = z.infer<typeof maritacaEnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    MARITACA_API_KEY: process.env.MARITACA_API_KEY,
    MARITACA_MODEL: process.env.MARITACA_MODEL,
  });

  return cachedEnv;
}

export function getStorageEnv(): StorageEnv {
  return storageEnvSchema.parse({
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  });
}

export function getMaritacaEnv(): MaritacaEnv {
  return maritacaEnvSchema.parse({
    MARITACA_API_KEY: process.env.MARITACA_API_KEY,
    MARITACA_MODEL: process.env.MARITACA_MODEL,
  });
}
