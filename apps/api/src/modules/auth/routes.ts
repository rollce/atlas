import { PlanCode, Role } from "@prisma/client";
import { createChallenge, verifySolution } from "altcha-lib";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  clearLoginFailures,
  assertLoginAllowed,
  recordLoginFailure,
} from "./brute-force.js";
import { requireAuth } from "./middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyConfirmSchema,
  verifyRequestSchema,
} from "./schemas.js";
import {
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./tokens.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function makeSlug(base: string): string {
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return `${clean || "org"}-${crypto.randomBytes(2).toString("hex")}`;
}

function parseBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown,
  reply: FastifyReply,
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
    });
    return null;
  }

  return parsed.data;
}

const altchaPayloadSchema = z.object({
  altcha: z.string().min(20),
});

const authRateLimitConfig = {
  rateLimit: {
    max: 15,
    timeWindow: "1 minute",
  },
} as const;

const altchaHmacKey = env.ALTCHA_HMAC_KEY ?? env.JWT_ACCESS_SECRET;

async function verifyAltchaFromBody(
  body: unknown,
  reply: FastifyReply,
): Promise<boolean> {
  if (env.NODE_ENV === "test") {
    return true;
  }

  const parsed = altchaPayloadSchema.safeParse(body);
  if (!parsed.success) {
    reply.status(400).send({
      code: "ALTCHA_REQUIRED",
      message: "Complete verification challenge before submitting this form",
    });
    return false;
  }

  const verified = await verifySolution(parsed.data.altcha, altchaHmacKey);
  if (!verified) {
    reply.status(400).send({
      code: "ALTCHA_INVALID",
      message: "Verification challenge failed",
    });
    return false;
  }

  return true;
}

async function createSessionWithTokens(params: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}> {
  const expiresAt = getRefreshTokenExpiryDate();

  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      refreshTokenHash: "pending",
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt,
    },
  });

  const accessToken = signAccessToken(params.userId, session.id);
  const refreshToken = signRefreshToken(params.userId, session.id);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash },
  });

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
    expiresAt,
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/auth/altcha",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (_request, reply) => {
      const challenge = await createChallenge({
        hmacKey: altchaHmacKey,
        maxnumber: 100_000,
        expires: new Date(Date.now() + 2 * 60 * 1000),
      });

      reply.send(challenge);
    },
  );

  app.post(
    "/api/v1/auth/register",
    { config: authRateLimitConfig },
    async (request, reply) => {
      if (!(await verifyAltchaFromBody(request.body, reply))) {
        return;
      }

      const body = parseBody(registerSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing) {
        reply.status(409).send({
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email is already registered",
        });
        return;
      }

      const passwordHash = await bcrypt.hash(body.password, 12);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          fullName: body.fullName,
          passwordHash,
        },
      });

      const organization = await prisma.organization.create({
        data: {
          name: body.organizationName ?? `${body.fullName}'s Org`,
          slug: makeSlug(body.organizationName ?? body.fullName),
          memberships: {
            create: {
              userId: user.id,
              role: Role.OWNER,
            },
          },
          subscriptions: {
            create: {
              planCode: PlanCode.FREE,
              status: "trial",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 14 * 24 * 3600 * 1000),
              trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
            },
          },
        },
      });

      const tokens = await createSessionWithTokens({
        userId: user.id,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        tokens,
      });
    },
  );

  app.post(
    "/api/v1/auth/login",
    { config: authRateLimitConfig },
    async (request, reply) => {
      if (!(await verifyAltchaFromBody(request.body, reply))) {
        return;
      }

      const body = parseBody(loginSchema, request.body, reply);
      if (!body) {
        return;
      }

      const attemptKey = `${body.email}:${request.ip}`;

      try {
        assertLoginAllowed(attemptKey);
      } catch (error) {
        const statusCode =
          (error as Error & { statusCode?: number }).statusCode ?? 429;
        reply.status(statusCode).send({
          code: "TOO_MANY_ATTEMPTS",
          message: (error as Error).message,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        recordLoginFailure(attemptKey);
        reply.status(401).send({
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        });
        return;
      }

      const validPassword = await bcrypt.compare(
        body.password,
        user.passwordHash,
      );
      if (!validPassword) {
        recordLoginFailure(attemptKey);
        reply.status(401).send({
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        });
        return;
      }

      clearLoginFailures(attemptKey);

      const tokens = await createSessionWithTokens({
        userId: user.id,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          emailVerified: user.emailVerified,
        },
        organizations: user.memberships.map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role,
        })),
        tokens,
      });
    },
  );

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const body = parseBody(refreshSchema, request.body, reply);
    if (!body) {
      return;
    }

    let claims;
    try {
      claims = verifyRefreshToken(body.refreshToken);
    } catch {
      reply.status(401).send({
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now()
    ) {
      reply
        .status(401)
        .send({ code: "SESSION_EXPIRED", message: "Session expired" });
      return;
    }

    const matches = await bcrypt.compare(
      body.refreshToken,
      session.refreshTokenHash,
    );
    if (!matches) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      reply.status(401).send({
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
      return;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await createSessionWithTokens({
      userId: session.userId,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    reply.send({ tokens });
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const body = parseBody(logoutSchema, request.body, reply);
    if (!body) {
      return;
    }

    if (body.sessionId) {
      await prisma.session.updateMany({
        where: { id: body.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (body.refreshToken) {
      try {
        const claims = verifyRefreshToken(body.refreshToken);
        await prisma.session.updateMany({
          where: { id: claims.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Keep logout idempotent.
      }
    }

    reply.send({ success: true });
  });

  app.post(
    "/api/v1/auth/forgot-password",
    { config: authRateLimitConfig },
    async (request, reply) => {
      if (!(await verifyAltchaFromBody(request.body, reply))) {
        return;
      }

      const body = parseBody(forgotPasswordSchema, request.body, reply);
      if (!body) {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      let mockResetToken: string | undefined;
      if (user) {
        const token = crypto.randomBytes(24).toString("hex");
        mockResetToken = token;

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });

        await prisma.auditLog
          .create({
            data: {
              organizationId:
                (
                  await prisma.membership.findFirst({
                    where: { userId: user.id },
                    select: { organizationId: true },
                  })
                )?.organizationId ?? "unknown-org",
              actorId: user.id,
              action: "auth.forgot_password_requested",
              entityType: "user",
              entityId: user.id,
            },
          })
          .catch(() => {
            // Not all users have organizations in early development.
          });
      }

      reply.send({
        message:
          "If the account exists, password reset instructions were generated.",
        mockResetToken:
          process.env.NODE_ENV === "development" ? mockResetToken : undefined,
      });
    },
  );

  app.post("/api/v1/auth/reset-password", async (request, reply) => {
    const body = parseBody(resetPasswordSchema, request.body, reply);
    if (!body) {
      return;
    }

    const tokenHash = hashToken(body.token);

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetToken) {
      reply.status(400).send({
        code: "INVALID_RESET_TOKEN",
        message: "Token is invalid or expired",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    reply.send({ success: true });
  });

  app.post(
    "/api/v1/auth/verify-email/request",
    { config: authRateLimitConfig },
    async (request, reply) => {
      if (!(await verifyAltchaFromBody(request.body, reply))) {
        return;
      }

      const body = parseBody(verifyRequestSchema, request.body, reply);
      if (!body) {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      let mockVerifyToken: string | undefined;

      if (user && !user.emailVerified) {
        const token = crypto.randomBytes(24).toString("hex");
        mockVerifyToken = token;

        await prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      reply.send({
        message:
          "If the account exists, verification instructions were generated.",
        mockVerifyToken:
          process.env.NODE_ENV === "development" ? mockVerifyToken : undefined,
      });
    },
  );

  app.post("/api/v1/auth/verify-email/confirm", async (request, reply) => {
    const body = parseBody(verifyConfirmSchema, request.body, reply);
    if (!body) {
      return;
    }

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: hashToken(body.token),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!record) {
      reply.status(400).send({
        code: "INVALID_VERIFY_TOKEN",
        message: "Token is invalid or expired",
      });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    reply.send({ success: true });
  });

  app.get(
    "/api/v1/auth/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User profile not found",
        });
        return;
      }

      reply.send({ user });
    },
  );

  app.patch(
    "/api/v1/auth/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const body = parseBody(updateProfileSchema, request.body, reply);
      if (!body) {
        return;
      }

      if (body.email) {
        const existing = await prisma.user.findUnique({
          where: { email: body.email },
          select: { id: true },
        });

        if (existing && existing.id !== request.auth.userId) {
          reply.status(409).send({
            code: "EMAIL_ALREADY_EXISTS",
            message: "Email is already registered",
          });
          return;
        }
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: { email: true },
      });

      if (!currentUser) {
        reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User profile not found",
        });
        return;
      }

      const updateData: {
        fullName?: string;
        email?: string;
        emailVerified?: Date | null;
      } = {};

      if (body.fullName !== undefined) {
        updateData.fullName = body.fullName;
      }

      if (body.email !== undefined) {
        updateData.email = body.email;
        if (body.email.toLowerCase() !== currentUser.email.toLowerCase()) {
          updateData.emailVerified = null;
        }
      }

      const user = await prisma.user.update({
        where: { id: request.auth.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      reply.send({ user });
    },
  );

  app.get(
    "/api/v1/auth/sessions",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const sessions = await prisma.session.findMany({
        where: { userId: request.auth.userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      });

      reply.send({
        activeSessionId: request.auth.sessionId,
        sessions,
      });
    },
  );

  app.post(
    "/api/v1/auth/sessions/revoke-all",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const result = await prisma.session.updateMany({
        where: {
          userId: request.auth.userId,
          revokedAt: null,
          id: { not: request.auth.sessionId },
        },
        data: {
          revokedAt: new Date(),
        },
      });

      reply.send({
        success: true,
        revokedCount: result.count,
      });
    },
  );
}
