import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";

function parseOrganizationHeader(
  header: string | string[] | undefined,
): string | null {
  if (Array.isArray(header)) {
    return header[0]?.trim() || null;
  }

  if (typeof header === "string") {
    return header.trim() || null;
  }

  return null;
}

export async function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.auth) {
    reply
      .status(401)
      .send({ code: "UNAUTHORIZED", message: "Missing auth context" });
    return;
  }

  const requestedOrganizationId = parseOrganizationHeader(
    request.headers["x-organization-id"],
  );

  if (requestedOrganizationId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: request.auth.userId,
        organizationId: requestedOrganizationId,
      },
      include: { organization: true },
    });

    if (!membership) {
      reply.status(403).send({
        code: "TENANT_ACCESS_DENIED",
        message: "You do not have access to this organization",
      });
      return;
    }

    request.tenant = {
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role: membership.role,
      membershipId: membership.id,
    };
    return;
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: request.auth.userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (memberships.length === 0) {
    reply.status(403).send({
      code: "TENANT_ACCESS_DENIED",
      message: "No organization memberships found for this user",
    });
    return;
  }

  if (memberships.length > 1) {
    reply.status(400).send({
      code: "TENANT_REQUIRED",
      message:
        "Multiple organizations found. Pass x-organization-id header to select tenant context.",
    });
    return;
  }

  const membership = memberships[0];
  if (!membership) {
    reply.status(403).send({
      code: "TENANT_ACCESS_DENIED",
      message: "No organization memberships found for this user",
    });
    return;
  }

  request.tenant = {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role,
    membershipId: membership.id,
  };
}

declare module "fastify" {
  interface FastifyRequest {
    tenant?: {
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      role: Role;
      membershipId: string;
    };
  }
}
