import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconLockAccess,
  IconReportAnalytics,
  IconRoute,
  IconServerCog,
  IconStack3,
} from "@tabler/icons-react";
import Link from "next/link";

const highlights = [
  {
    title: "Tenant Isolation",
    icon: IconLockAccess,
    text: "Shared database with strict tenant boundaries and membership-aware access control.",
  },
  {
    title: "Billing Architecture",
    icon: IconBuildingStore,
    text: "Free / Pro / Business plans with feature gates and usage-limit checks.",
  },
  {
    title: "Queue Workers",
    icon: IconServerCog,
    text: "Redis + BullMQ workers for invitations, email flows, and report generation.",
  },
  {
    title: "Analytics",
    icon: IconReportAnalytics,
    text: "Audit logs, request tracing, and business dashboards for workspace owners.",
  },
  {
    title: "Domain Modeling",
    icon: IconStack3,
    text: "Organizations, projects, tasks, clients, memberships, sessions and subscriptions.",
  },
  {
    title: "Deployment Ready",
    icon: IconRoute,
    text: "Dockerized services prepared for Railway multi-service deployment.",
  },
];

export default function HomePage() {
  return (
    <Container size="lg" py={64}>
      <Stack gap="xl" mb={32}>
        <Badge color="teal" variant="light" w="fit-content">
          Atlas.rollsev.work
        </Badge>
        <Title
          order={1}
          style={{ fontSize: "clamp(2.2rem, 5vw, 4.2rem)", lineHeight: 1.08 }}
        >
          Production-style Multi-tenant SaaS Portfolio Project
        </Title>
        <Text c="dimmed" maw={760}>
          Atlas is a full B2B workspace platform demo: organizations, projects,
          clients, role-based access, subscriptions, audit logs, and background
          jobs. Built to demonstrate senior-level product architecture.
        </Text>
        <Group>
          <Button component={Link} href="/app/dashboard" size="md" color="teal">
            Open App
          </Button>
          <Button
            component={Link}
            href="/pricing"
            variant="light"
            size="md"
            color="teal"
          >
            Pricing
          </Button>
        </Group>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {highlights.map((item) => (
          <Card key={item.title} withBorder radius="lg" p="lg" bg="dark.7">
            <item.icon size={20} color="#2dd4bf" />
            <Text fw={600} mt="sm" mb={6}>
              {item.title}
            </Text>
            <Text size="sm" c="dimmed">
              {item.text}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
