import { PlanCode } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { planDefinitions, type BillingFeature } from "./plans.js";

export type UsageResource = "members" | "projects";

type BillingContext = {
  planCode: PlanCode;
};

async function resolveBillingContext(
  organizationId: string,
): Promise<BillingContext> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId },
    orderBy: [{ currentPeriodEnd: "desc" }, { createdAt: "desc" }],
    select: { planCode: true },
  });

  return {
    planCode: subscription?.planCode ?? PlanCode.FREE,
  };
}

async function getCurrentUsage(
  organizationId: string,
  resource: UsageResource,
): Promise<number> {
  if (resource === "members") {
    return prisma.membership.count({ where: { organizationId } });
  }

  return prisma.project.count({ where: { organizationId } });
}

export function requireFeature(feature: BillingFeature) {
  return async function featureGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.tenant) {
      reply.status(401).send({
        code: "TENANT_CONTEXT_MISSING",
        message: "Tenant context is required before feature checks",
      });
      return;
    }

    const context = await resolveBillingContext(request.tenant.organizationId);
    const definition = planDefinitions[context.planCode];

    if (!definition.features[feature]) {
      reply.status(402).send({
        code: "FEATURE_NOT_AVAILABLE",
        message: `Feature '${feature}' is not available on current plan`,
        plan: context.planCode,
      });
      return;
    }
  };
}

export function enforceUsageLimit(resource: UsageResource) {
  return async function usageLimitGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.tenant) {
      reply.status(401).send({
        code: "TENANT_CONTEXT_MISSING",
        message: "Tenant context is required before usage checks",
      });
      return;
    }

    const context = await resolveBillingContext(request.tenant.organizationId);
    const definition = planDefinitions[context.planCode];
    const limit = definition.limits[resource];

    if (limit === null) {
      return;
    }

    const usage = await getCurrentUsage(
      request.tenant.organizationId,
      resource,
    );

    if (usage >= limit) {
      reply.status(402).send({
        code: "USAGE_LIMIT_REACHED",
        message: `Usage limit reached for '${resource}'`,
        plan: context.planCode,
        limit,
        usage,
      });
    }
  };
}

export async function getBillingSnapshot(organizationId: string) {
  const context = await resolveBillingContext(organizationId);
  const definition = planDefinitions[context.planCode];
  const [members, projects] = await Promise.all([
    getCurrentUsage(organizationId, "members"),
    getCurrentUsage(organizationId, "projects"),
  ]);

  return {
    planCode: context.planCode,
    limits: definition.limits,
    features: definition.features,
    usage: {
      members,
      projects,
      storageGb: null,
    },
  };
}
