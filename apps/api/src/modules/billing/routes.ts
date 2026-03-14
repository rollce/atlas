import { PlanCode } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../auth/middleware.js";
import { requireTenant } from "../tenancy/middleware.js";
import { getBillingSnapshot } from "./middleware.js";
import { planDefinitions } from "./plans.js";

const planCatalog: Record<
  PlanCode,
  {
    label: string;
    description: string;
    priceMonthly: number;
  }
> = {
  [PlanCode.FREE]: {
    label: "Free",
    description: "For small teams validating early workflows.",
    priceMonthly: 0,
  },
  [PlanCode.PRO]: {
    label: "Pro",
    description: "For growing teams that need production collaboration.",
    priceMonthly: 39,
  },
  [PlanCode.BUSINESS]: {
    label: "Business",
    description: "For larger organizations with advanced controls.",
    priceMonthly: 129,
  },
};

const mockCheckoutSchema = z.object({
  planCode: z
    .nativeEnum(PlanCode)
    .refine((planCode) => planCode !== PlanCode.FREE, {
      message: "Mock checkout is available for paid plans only",
    }),
  cardHolder: z.string().trim().min(2).max(120),
  cardNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, "")),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^\d{2}$/),
  cvc: z.string().regex(/^\d{3,4}$/),
});

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

function ensureTenant(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  if (!request.tenant) {
    reply.status(401).send({
      code: "TENANT_CONTEXT_MISSING",
      message: "Tenant context is required",
    });
    return null;
  }

  return request.tenant.organizationId;
}

function detectCardBrand(cardNumber: string): string {
  if (cardNumber.startsWith("4")) {
    return "visa";
  }

  if (/^5[1-5]/.test(cardNumber)) {
    return "mastercard";
  }

  if (/^3[47]/.test(cardNumber)) {
    return "amex";
  }

  return "card";
}

function isValidLuhn(cardNumber: string): boolean {
  if (!/^\d{13,19}$/.test(cardNumber)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
    const digit = Number(cardNumber[index]);
    if (Number.isNaN(digit)) {
      return false;
    }

    let normalized = digit;
    if (shouldDouble) {
      normalized *= 2;
      if (normalized > 9) {
        normalized -= 9;
      }
    }

    sum += normalized;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function invoiceAmount(plan: PlanCode): number {
  return planCatalog[plan].priceMonthly;
}

function toInvoiceStatus(status: string): string {
  if (status === "trial") {
    return "trial";
  }

  if (status === "active") {
    return "paid";
  }

  return status;
}

function toPeriod(date: Date): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${year}-${month}`;
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/tenant/billing/plans",
    { preHandler: [requireAuth, requireTenant] },
    async (_request, reply) => {
      reply.send({
        plans: Object.values(planDefinitions).map((definition) => ({
          code: definition.code,
          label: planCatalog[definition.code].label,
          description: planCatalog[definition.code].description,
          priceMonthly: planCatalog[definition.code].priceMonthly,
          limits: definition.limits,
          features: definition.features,
        })),
      });
    },
  );

  app.get(
    "/api/v1/tenant/billing/usage",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      const organizationId = ensureTenant(request, reply);
      if (!organizationId) {
        return;
      }

      const snapshot = await getBillingSnapshot(organizationId);

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
      const organizationId = ensureTenant(request, reply);
      if (!organizationId) {
        return;
      }

      const subscriptions = await prisma.subscription.findMany({
        where: { organizationId },
        orderBy: [{ currentPeriodStart: "desc" }, { createdAt: "desc" }],
        take: 8,
      });

      const invoices = subscriptions.map((subscription) => ({
        id: `mock-${subscription.id}`,
        period: toPeriod(subscription.currentPeriodStart),
        plan: subscription.planCode,
        amount: invoiceAmount(subscription.planCode),
        currency: "USD",
        status: toInvoiceStatus(subscription.status),
        createdAt: subscription.createdAt,
      }));

      reply.send({ invoices });
    },
  );

  app.post(
    "/api/v1/tenant/billing/checkout/mock",
    {
      preHandler: [requireAuth, requireTenant],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const organizationId = ensureTenant(request, reply);
      if (!organizationId) {
        return;
      }

      const body = parseBody(mockCheckoutSchema, request.body, reply);
      if (!body) {
        return;
      }

      if (!isValidLuhn(body.cardNumber)) {
        reply.status(400).send({
          code: "INVALID_CARD_NUMBER",
          message: "Card number is invalid for mock checkout",
        });
        return;
      }

      const now = new Date();
      const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const cardBrand = detectCardBrand(body.cardNumber);
      const last4 = body.cardNumber.slice(-4);
      const authorizationCode = `MOCK-${Math.floor(100000 + Math.random() * 900000)}`;

      const subscription = await prisma.subscription.create({
        data: {
          organizationId,
          planCode: body.planCode,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
          trialEndsAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          actorId: request.auth?.userId ?? null,
          action: "billing.mock_checkout_paid",
          entityType: "subscription",
          entityId: subscription.id,
          metadata: {
            planCode: subscription.planCode,
            amount: invoiceAmount(subscription.planCode),
            currency: "USD",
            cardBrand,
            last4,
          },
        },
      });

      reply.send({
        success: true,
        subscription: {
          id: subscription.id,
          planCode: subscription.planCode,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
        payment: {
          gateway: "mock-stripe",
          cardBrand,
          last4,
          authorizationCode,
        },
        invoice: {
          id: `mock-${subscription.id}`,
          period: toPeriod(subscription.currentPeriodStart),
          amount: invoiceAmount(subscription.planCode),
          currency: "USD",
          status: "paid",
        },
      });
    },
  );
}
