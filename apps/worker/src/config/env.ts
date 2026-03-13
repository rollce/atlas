import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  REDIS_URL: z.string().url(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid worker environment",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
