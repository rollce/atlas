import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./tokens.js";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    reply
      .status(401)
      .send({ code: "UNAUTHORIZED", message: "Missing access token" });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const claims = verifyAccessToken(token);
    request.auth = {
      userId: claims.sub,
      sessionId: claims.sid,
    };
  } catch {
    reply
      .status(401)
      .send({ code: "UNAUTHORIZED", message: "Invalid access token" });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId: string;
    };
  }
}
