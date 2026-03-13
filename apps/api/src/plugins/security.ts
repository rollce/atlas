import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export async function registerSecurityPlugins(
  app: FastifyInstance,
): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
}
