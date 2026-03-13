import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  WORKER_PORT: z.coerce.number().int().positive().default(4040),
  REDIS_URL: z.string().url(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  WORKER_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  WORKER_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(2000),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(60).default(86400),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid worker environment",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  HEALTH_PORT: parsed.data.PORT ?? parsed.data.WORKER_PORT,
};
