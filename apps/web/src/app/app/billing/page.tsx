import {
  Badge,
  Button,
  Card,
  Group,
  List,
  ListItem,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing & Subscription"
        subtitle="Feature gates, usage limits, trial period, and upgrade/downgrade flow entrypoint."
      />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Current plan</Text>
            <Badge color="teal">Pro</Badge>
          </Group>
          <List spacing="xs" mb="md">
            <ListItem>Members: 7 / 15</ListItem>
            <ListItem>Projects: 21 / unlimited</ListItem>
            <ListItem>Storage: 1.6GB / 10GB</ListItem>
          </List>
          <Button color="teal">Upgrade to Business</Button>
        </Card>

        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text fw={600} mb="sm">
            Invoice history
          </Text>
          <Text c="dimmed" size="sm" mb="xs">
            2026-03-01 • Pro Plan • $39 • Paid
          </Text>
          <Text c="dimmed" size="sm" mb="xs">
            2026-02-01 • Pro Plan • $39 • Paid
          </Text>
          <Text c="dimmed" size="sm">
            2026-01-01 • Trial • $0 • Closed
          </Text>
        </Card>
      </SimpleGrid>
    </>
  );
}
