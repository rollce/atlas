import { env } from "../config/env.js";
import type { FastifyInstance } from "fastify";

export async function v1Routes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1", async () => ({
    service: "atlas-api",
    message: "API v1 is online",
  }));

  app.get("/api/v1/meta", async () => ({
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
  }));
}
