"use client";

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  List,
  ListItem,
  Modal,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import { hasRequiredRole } from "@/lib/permissions";
import { generateMockCardData, type MockCardData } from "@/lib/mock-card";

type PlanCode = "FREE" | "PRO" | "BUSINESS";

type BillingPlan = {
  code: PlanCode;
  label: string;
  description: string;
  priceMonthly: number;
  limits: {
    members: number | null;
    projects: number | null;
    storageGb: number | null;
  };
  features: Record<string, boolean>;
};

type BillingUsagePayload = {
  plan: PlanCode;
  limits: {
    members: number | null;
    projects: number | null;
    storageGb: number | null;
  };
  usage: {
    members: number;
    projects: number;
    storageGb: number | null;
  };
  features: Record<string, boolean>;
};

type BillingInvoice = {
  id: string;
  period: string;
  plan: PlanCode;
  amount: number;
  currency: string;
  status: string;
  createdAt?: string;
};

function formatLimit(value: number | null): string {
  return value === null ? "unlimited" : `${value}`;
}

function planBadgeColor(plan: PlanCode): string {
  if (plan === "BUSINESS") {
    return "orange";
  }

  if (plan === "PRO") {
    return "teal";
  }

  return "gray";
}

export default function BillingPage() {
  const { request, status, user, activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [usage, setUsage] = useState<BillingUsagePayload | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [cardData, setCardData] = useState<MockCardData>({
    cardHolder: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  });

  const canManageBilling = hasRequiredRole(activeRole, [
    "OWNER",
    "ADMIN",
    "MANAGER",
  ]);

  const loadBillingData = useCallback(async () => {
    if (status !== "authenticated") {
      return;
    }

    setLoading(true);
    try {
      const [usagePayload, plansPayload, invoicesPayload] = await Promise.all([
        request<BillingUsagePayload>("/tenant/billing/usage", {
          tenant: true,
        }),
        request<{ plans: BillingPlan[] }>("/tenant/billing/plans", {
          tenant: true,
        }),
        request<{ invoices: BillingInvoice[] }>("/tenant/billing/invoices", {
          tenant: true,
        }),
      ]);

      setUsage(usagePayload);
      setPlans(plansPayload.plans);
      setInvoices(invoicesPayload.invoices);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Billing load failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [request, status]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const openCheckout = (planCode: PlanCode) => {
    const generated = generateMockCardData(user?.fullName ?? "");
    setSelectedPlan(planCode);
    setCardData(generated);
    setCheckoutOpen(true);
  };

  const generateAnotherCard = () => {
    setCardData(generateMockCardData(user?.fullName ?? ""));
  };

  const selectedPlanDetails = useMemo(
    () => plans.find((plan) => plan.code === selectedPlan) ?? null,
    [plans, selectedPlan],
  );

  const processMockCheckout = async () => {
    if (!selectedPlan) {
      return;
    }

    setCheckoutLoading(true);
    try {
      const payload = await request<{
        success: boolean;
        invoice: {
          id: string;
          period: string;
          amount: number;
          currency: string;
          status: string;
        };
      }>("/tenant/billing/checkout/mock", {
        method: "POST",
        tenant: true,
        body: {
          planCode: selectedPlan,
          cardHolder: cardData.cardHolder,
          cardNumber: cardData.cardNumber.replace(/\s+/g, ""),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cvc: cardData.cvc,
        },
      });

      notifications.show({
        color: "teal",
        title: "Payment approved",
        message: `Mock invoice ${payload.invoice.period} was paid successfully`,
      });

      setCheckoutOpen(false);
      await loadBillingData();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Payment failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Billing & Subscription"
        subtitle="Mock checkout for portfolio demos: fake cards, successful payments, and plan upgrades."
      />

      {loading ? (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Skeleton h={240} radius="lg" />
          <Skeleton h={240} radius="lg" />
        </SimpleGrid>
      ) : (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder radius="lg" p="lg" bg="dark.6">
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Current plan</Text>
                <Badge color={planBadgeColor(usage?.plan ?? "FREE")}>
                  {usage?.plan ?? "FREE"}
                </Badge>
              </Group>
              <List spacing="xs" mb="md">
                <ListItem>
                  Members: {usage?.usage.members ?? 0} /{" "}
                  {formatLimit(usage?.limits.members ?? null)}
                </ListItem>
                <ListItem>
                  Projects: {usage?.usage.projects ?? 0} /{" "}
                  {formatLimit(usage?.limits.projects ?? null)}
                </ListItem>
                <ListItem>
                  Storage: {usage?.usage.storageGb ?? 0}GB /{" "}
                  {formatLimit(usage?.limits.storageGb ?? null)}GB
                </ListItem>
              </List>
              <Text c="dimmed" size="sm">
                Use plan cards below to run mock payment checkout and switch
                subscription instantly.
              </Text>
            </Card>

            <Card withBorder radius="lg" p="lg" bg="dark.6">
              <Text fw={600} mb="sm">
                Invoice history
              </Text>
              {invoices.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No invoices yet. Complete a mock checkout to generate one.
                </Text>
              ) : (
                invoices.slice(0, 5).map((invoice) => (
                  <Text key={invoice.id} c="dimmed" size="sm" mb="xs">
                    {invoice.period} • {invoice.plan} • ${invoice.amount} •{" "}
                    {invoice.status}
                  </Text>
                ))
              )}
            </Card>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 3 }}>
            {plans.map((plan) => {
              const isCurrent = usage?.plan === plan.code;
              const isPaidPlan = plan.code !== "FREE";

              return (
                <Card key={plan.code} withBorder radius="lg" p="lg" bg="dark.6">
                  <Group justify="space-between" mb="xs">
                    <Text fw={700}>{plan.label}</Text>
                    {isCurrent ? (
                      <Badge color="teal">Current</Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        Available
                      </Badge>
                    )}
                  </Group>
                  <Text size="xl" fw={700} mb={4}>
                    ${plan.priceMonthly}
                    <Text span c="dimmed" fw={500} size="sm">
                      {" "}
                      /month
                    </Text>
                  </Text>
                  <Text c="dimmed" size="sm" mb="md">
                    {plan.description}
                  </Text>
                  <List spacing={6} size="sm" mb="md">
                    <ListItem>
                      Members: {formatLimit(plan.limits.members)}
                    </ListItem>
                    <ListItem>
                      Projects: {formatLimit(plan.limits.projects)}
                    </ListItem>
                    <ListItem>
                      Storage: {formatLimit(plan.limits.storageGb)}GB
                    </ListItem>
                  </List>
                  <Button
                    color="teal"
                    variant={isCurrent ? "light" : "filled"}
                    disabled={!isPaidPlan || isCurrent || !canManageBilling}
                    onClick={() => openCheckout(plan.code)}
                    fullWidth
                  >
                    {isCurrent
                      ? "Current plan"
                      : isPaidPlan
                        ? "Mock checkout"
                        : "Included"}
                  </Button>
                </Card>
              );
            })}
          </SimpleGrid>
        </Stack>
      )}

      <Modal
        opened={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={`Mock Checkout${selectedPlanDetails ? ` • ${selectedPlanDetails.label}` : ""}`}
        centered
      >
        <Stack>
          <Text c="dimmed" size="sm">
            Demo payment flow for portfolio showcase. Use generated fake card
            details and submit to mark invoice as paid.
          </Text>

          <Divider />

          <TextInput
            label="Card holder"
            value={cardData.cardHolder}
            onChange={(event) =>
              setCardData((current) => ({
                ...current,
                cardHolder: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="Card number"
            value={cardData.cardNumber}
            onChange={(event) =>
              setCardData((current) => ({
                ...current,
                cardNumber: event.currentTarget.value,
              }))
            }
          />
          <Group grow>
            <Select
              label="Exp month"
              data={Array.from({ length: 12 }, (_, index) => {
                const month = `${index + 1}`.padStart(2, "0");
                return { value: month, label: month };
              })}
              value={cardData.expiryMonth}
              onChange={(value) =>
                setCardData((current) => ({
                  ...current,
                  expiryMonth: value ?? "",
                }))
              }
            />
            <TextInput
              label="Exp year"
              value={cardData.expiryYear}
              onChange={(event) =>
                setCardData((current) => ({
                  ...current,
                  expiryYear: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="CVC"
              value={cardData.cvc}
              onChange={(event) =>
                setCardData((current) => ({
                  ...current,
                  cvc: event.currentTarget.value,
                }))
              }
            />
          </Group>

          <Group justify="space-between">
            <Button variant="light" onClick={generateAnotherCard}>
              Generate random test card
            </Button>
            <Button
              color="teal"
              loading={checkoutLoading}
              onClick={processMockCheckout}
            >
              Pay and activate subscription
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
