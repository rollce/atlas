import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export async function registerSecurityPlugins(
  app: FastifyInstance,
): Promise<void> {
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed"), false);
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      code: "RATE_LIMITED",
      message: "Too many requests, please retry in a minute.",
    }),
  });
}
