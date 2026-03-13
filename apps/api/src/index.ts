import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { registerSecurityPlugins } from "./plugins/security.js";
import { authRoutes } from "./modules/auth/routes.js";
import { healthRoutes } from "./routes/health.js";
import { v1Routes } from "./routes/v1.js";

export function buildServer() {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.NODE_ENV === "production" ? "info" : "debug",
          },
    trustProxy: true,
    requestIdHeader: "x-correlation-id",
    genReqId: () => crypto.randomUUID(),
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled API error");
    reply.status(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    });
  });

  app.addHook("onRequest", async (request) => {
    request.log.info({
      correlationId: request.id,
      method: request.method,
      path: request.url,
    });
  });

  return app;
}

async function bootstrap() {
  const app = buildServer();

  await registerSecurityPlugins(app);
  await healthRoutes(app);
  await v1Routes(app);
  await authRoutes(app);

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`atlas-api started on port ${env.PORT}`);
}

const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  bootstrap().catch((error) => {
    console.error("Failed to start atlas-api", error);
    process.exit(1);
  });
}
