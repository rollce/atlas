import { PlanCode } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { requireTenant } from "../tenancy/middleware.js";
import { getBillingSnapshot } from "./middleware.js";

function invoiceAmount(plan: PlanCode): number {
  if (plan === PlanCode.FREE) {
    return 0;
  }

  if (plan === PlanCode.PRO) {
    return 39;
  }

  return 129;
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/tenant/billing/usage",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const snapshot = await getBillingSnapshot(request.tenant.organizationId);

      reply.send({
        plan: snapshot.planCode,
        limits: snapshot.limits,
        usage: snapshot.usage,
        features: snapshot.features,
      });
    },
  );

  app.get(
    "/api/v1/tenant/billing/invoices",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const snapshot = await getBillingSnapshot(request.tenant.organizationId);

      reply.send({
        invoices: [
          {
            id: "mock-2026-03",
            period: "2026-03",
            plan: snapshot.planCode,
            amount: invoiceAmount(snapshot.planCode),
            currency: "USD",
            status: "paid",
          },
          {
            id: "mock-2026-02",
            period: "2026-02",
            plan: snapshot.planCode,
            amount: invoiceAmount(snapshot.planCode),
            currency: "USD",
            status: "paid",
          },
        ],
      });
    },
  );
}
