import { PlanCode, Role } from "@prisma/client";
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { enforceUsageLimit, requireFeature } from "../billing/middleware.js";
import { requireAuth } from "../auth/middleware.js";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  createOrganizationSchema,
} from "./schemas.js";
import { requireTenant } from "./middleware.js";
import { requirePolicy } from "./policy.js";

const organizationParamsSchema = z.object({
  id: z.string().cuid(),
});

const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    billingEmail: z.string().trim().email().nullable().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.billingEmail !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

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

function parseParams<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  params: unknown,
  reply: FastifyReply,
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: "Invalid route params",
    });
    return null;
  }

  return parsed.data;
}

export async function tenancyRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/organizations",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const memberships = await prisma.membership.findMany({
        where: { userId: request.auth.userId },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      });

      reply.send({
        organizations: memberships.map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role,
        })),
      });
    },
  );

  app.post(
    "/api/v1/organizations",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const body = parseBody(createOrganizationSchema, request.body, reply);
      if (!body) {
        return;
      }

      const organization = await prisma.organization.create({
        data: {
          slug: makeSlug(body.name),
          name: body.name,
          memberships: {
            create: {
              userId: request.auth.userId,
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

      reply.status(201).send({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      });
    },
  );

  app.patch(
    "/api/v1/organizations/:id",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("organization:update"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseParams(
        organizationParamsSchema,
        request.params,
        reply,
      );
      if (!params) {
        return;
      }

      if (params.id !== request.tenant.organizationId) {
        reply.status(404).send({
          code: "ORGANIZATION_NOT_FOUND",
          message: "Organization not found in tenant scope",
        });
        return;
      }

      const body = parseBody(updateOrganizationSchema, request.body, reply);
      if (!body) {
        return;
      }

      const organization = await prisma.organization.update({
        where: { id: request.tenant.organizationId },
        data: {
          name: body.name,
          billingEmail:
            body.billingEmail === undefined ? undefined : body.billingEmail,
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: request.tenant.organizationId,
          actorId: request.auth.userId,
          action: "organization.updated",
          entityType: "organization",
          entityId: organization.id,
          metadata: {
            name: body.name,
            billingEmail:
              body.billingEmail === undefined ? "unchanged" : body.billingEmail,
          },
        },
      });

      reply.send({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          billingEmail: organization.billingEmail,
        },
      });
    },
  );

  app.delete(
    "/api/v1/organizations/:id",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("organization:delete"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseParams(
        organizationParamsSchema,
        request.params,
        reply,
      );
      if (!params) {
        return;
      }

      if (params.id !== request.tenant.organizationId) {
        reply.status(404).send({
          code: "ORGANIZATION_NOT_FOUND",
          message: "Organization not found in tenant scope",
        });
        return;
      }

      const membershipCount = await prisma.membership.count({
        where: { userId: request.auth.userId },
      });

      if (membershipCount <= 1) {
        reply.status(400).send({
          code: "LAST_ORGANIZATION",
          message:
            "Create or join another organization before deleting this one",
        });
        return;
      }

      await prisma.organization.delete({
        where: { id: request.tenant.organizationId },
      });

      reply.send({ success: true });
    },
  );

  app.get(
    "/api/v1/tenant/context",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      reply.send({
        tenant: request.tenant,
      });
    },
  );

  app.get(
    "/api/v1/tenant/members",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const memberships = await prisma.membership.findMany({
        where: { organizationId: request.tenant.organizationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              emailVerified: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      reply.send({
        members: memberships.map((membership) => ({
          id: membership.id,
          role: membership.role,
          createdAt: membership.createdAt,
          user: membership.user,
        })),
      });
    },
  );

  app.get(
    "/api/v1/tenant/invitations",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const invitations = await prisma.invitation.findMany({
        where: {
          organizationId: request.tenant.organizationId,
          acceptedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      reply.send({
        invitations: invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })),
      });
    },
  );

  app.post(
    "/api/v1/tenant/invitations",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("invitation:create"),
        requireFeature("advanced_permissions"),
        enforceUsageLimit("members"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const body = parseBody(createInvitationSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existingMember = await prisma.membership.findFirst({
        where: {
          organizationId: request.tenant.organizationId,
          user: {
            email: body.email,
          },
        },
      });

      if (existingMember) {
        reply.status(409).send({
          code: "MEMBER_ALREADY_EXISTS",
          message: "User already belongs to this organization",
        });
        return;
      }

      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          organizationId: request.tenant.organizationId,
          email: body.email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvitation) {
        reply.status(409).send({
          code: "INVITATION_ALREADY_SENT",
          message: "An active invitation already exists for this email",
        });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      const invitation = await prisma.invitation.create({
        data: {
          organizationId: request.tenant.organizationId,
          inviterId: request.auth.userId,
          email: body.email,
          role: body.role,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: request.tenant.organizationId,
          actorId: request.auth.userId,
          action: "invitation.created",
          entityType: "invitation",
          entityId: invitation.id,
          metadata: {
            role: invitation.role,
            email: invitation.email,
          },
        },
      });

      reply.status(201).send({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        mockInvitationToken:
          process.env.NODE_ENV === "development" ? token : undefined,
      });
    },
  );

  app.post(
    "/api/v1/tenant/invitations/accept",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.auth) {
        reply
          .status(401)
          .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
        return;
      }

      const body = parseBody(acceptInvitationSchema, request.body, reply);
      if (!body) {
        return;
      }

      const invitation = await prisma.invitation.findUnique({
        where: { token: body.token },
        include: { organization: true },
      });

      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.expiresAt.getTime() < Date.now()
      ) {
        reply.status(400).send({
          code: "INVITATION_INVALID",
          message: "Invitation token is invalid or expired",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: { email: true },
      });

      if (!user) {
        reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
        return;
      }

      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        reply.status(403).send({
          code: "INVITATION_EMAIL_MISMATCH",
          message:
            "Invitation email does not match the authenticated user email",
        });
        return;
      }

      const membership = await prisma.$transaction(async (tx) => {
        const ensuredMembership = await tx.membership.upsert({
          where: {
            userId_organizationId: {
              userId: request.auth!.userId,
              organizationId: invitation.organizationId,
            },
          },
          update: {},
          create: {
            userId: request.auth!.userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            organizationId: invitation.organizationId,
            actorId: request.auth!.userId,
            action: "invitation.accepted",
            entityType: "invitation",
            entityId: invitation.id,
            metadata: { role: ensuredMembership.role, email: invitation.email },
          },
        });

        return ensuredMembership;
      });

      reply.send({
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
        membership: {
          id: membership.id,
          role: membership.role,
        },
      });
    },
  );
}
