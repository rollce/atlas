import { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { hasRequiredRole } from "./rbac.js";

export type TenantPolicyAction =
  | "organization:update"
  | "organization:delete"
  | "invitation:create"
  | "workspace:write"
  | "workspace:delete"
  | "client:write"
  | "client:delete"
  | "project:write"
  | "project:delete"
  | "task:write"
  | "task:delete";

const policyRoles: Record<TenantPolicyAction, Role[]> = {
  "organization:update": [Role.OWNER, Role.ADMIN],
  "organization:delete": [Role.OWNER],
  "invitation:create": [Role.OWNER, Role.ADMIN],
  "workspace:write": [Role.OWNER, Role.ADMIN, Role.MANAGER],
  "workspace:delete": [Role.OWNER, Role.ADMIN],
  "client:write": [Role.OWNER, Role.ADMIN, Role.MANAGER],
  "client:delete": [Role.OWNER, Role.ADMIN],
  "project:write": [Role.OWNER, Role.ADMIN, Role.MANAGER],
  "project:delete": [Role.OWNER, Role.ADMIN],
  "task:write": [Role.OWNER, Role.ADMIN, Role.MANAGER],
  "task:delete": [Role.OWNER, Role.ADMIN, Role.MANAGER],
};

type PolicyCheckResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      statusCode?: number;
      code?: string;
      message?: string;
    };

type PolicyCheck = (
  request: FastifyRequest,
) => Promise<PolicyCheckResult> | PolicyCheckResult;

export function canPerformTenantAction(
  currentRole: Role,
  action: TenantPolicyAction,
): boolean {
  return hasRequiredRole(currentRole, policyRoles[action]);
}

function deny(
  reply: FastifyReply,
  action: TenantPolicyAction,
  result?: Omit<Extract<PolicyCheckResult, { allowed: false }>, "allowed">,
) {
  reply.status(result?.statusCode ?? 403).send({
    code: result?.code ?? "FORBIDDEN_POLICY",
    message:
      result?.message ??
      `Policy denied for action "${action}" in this tenant context`,
  });
}

export function requirePolicy(
  action: TenantPolicyAction,
  options?: {
    check?: PolicyCheck;
  },
) {
  return async function policyGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.tenant) {
      reply.status(401).send({
        code: "TENANT_CONTEXT_MISSING",
        message: "Tenant context is required before policy checks",
      });
      return;
    }

    if (!canPerformTenantAction(request.tenant.role, action)) {
      deny(reply, action);
      return;
    }

    if (!options?.check) {
      return;
    }

    const result = await options.check(request);
    if (!result.allowed) {
      deny(reply, action, result);
    }
  };
}
