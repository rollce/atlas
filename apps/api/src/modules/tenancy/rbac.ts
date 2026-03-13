import { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

const roleWeight: Record<Role, number> = {
  [Role.OWNER]: 400,
  [Role.ADMIN]: 300,
  [Role.MANAGER]: 200,
  [Role.MEMBER]: 100,
};

export function hasRequiredRole(
  currentRole: Role,
  allowedRoles: Role[],
): boolean {
  const requiredWeight = Math.min(
    ...allowedRoles.map((role) => roleWeight[role]),
  );
  return roleWeight[currentRole] >= requiredWeight;
}

export function requireTenantRole(allowedRoles: Role[]) {
  return async function tenantRoleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.tenant) {
      reply.status(401).send({
        code: "TENANT_CONTEXT_MISSING",
        message: "Tenant context is required before RBAC checks",
      });
      return;
    }

    if (!hasRequiredRole(request.tenant.role, allowedRoles)) {
      reply.status(403).send({
        code: "FORBIDDEN",
        message: "Insufficient role permissions",
      });
    }
  };
}
