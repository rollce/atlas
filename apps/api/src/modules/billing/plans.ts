import { PlanCode } from "@prisma/client";

export const BILLING_FEATURES = [
  "advanced_permissions",
  "audit_logs",
  "usage_analytics",
  "priority_support",
] as const;

export type BillingFeature = (typeof BILLING_FEATURES)[number];

export type PlanLimits = {
  members: number | null;
  projects: number | null;
  storageGb: number | null;
};

export type PlanDefinition = {
  code: PlanCode;
  limits: PlanLimits;
  features: Record<BillingFeature, boolean>;
};

export const planDefinitions: Record<PlanCode, PlanDefinition> = {
  [PlanCode.FREE]: {
    code: PlanCode.FREE,
    limits: {
      members: 3,
      projects: 2,
      storageGb: 1,
    },
    features: {
      advanced_permissions: false,
      audit_logs: false,
      usage_analytics: false,
      priority_support: false,
    },
  },
  [PlanCode.PRO]: {
    code: PlanCode.PRO,
    limits: {
      members: 15,
      projects: null,
      storageGb: 10,
    },
    features: {
      advanced_permissions: true,
      audit_logs: true,
      usage_analytics: false,
      priority_support: false,
    },
  },
  [PlanCode.BUSINESS]: {
    code: PlanCode.BUSINESS,
    limits: {
      members: null,
      projects: null,
      storageGb: 100,
    },
    features: {
      advanced_permissions: true,
      audit_logs: true,
      usage_analytics: true,
      priority_support: true,
    },
  },
};
