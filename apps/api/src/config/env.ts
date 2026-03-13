import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_VERSION: z.string().min(1).default("0.1.0"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.string().min(2),
  REFRESH_TOKEN_TTL: z.string().min(2),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment variables",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
