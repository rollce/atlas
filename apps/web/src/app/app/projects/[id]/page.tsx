import { Badge, Card, Group, List, Tabs, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";

const knownIds = new Set(["atlas-redesign", "tenant-hardening", "billing-v2"]);

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!knownIds.has(id)) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Project: ${id}`}
        subtitle="Detailed view with tasks, activity timeline, and delivery notes."
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Group mb="md">
          <Badge color="teal">Active</Badge>
          <Badge color="blue" variant="light">
            Client-facing
          </Badge>
        </Group>

        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="activity">Activity</Tabs.Tab>
            <Tabs.Tab value="risks">Risks</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <Text c="dimmed" mb="sm">
              Tenant-safe project details are loaded by organization + workspace
              scope.
            </Text>
            <List spacing="xs">
              <List.Item>24 tasks total, 15 completed</List.Item>
              <List.Item>4 collaborators, 2 client stakeholders</List.Item>
              <List.Item>Next milestone in 4 days</List.Item>
            </List>
          </Tabs.Panel>

          <Tabs.Panel value="activity" pt="md">
            <Text c="dimmed">
              Recent actions: status updates, assignment changes, due-date
              edits.
            </Text>
          </Tabs.Panel>

          <Tabs.Panel value="risks" pt="md">
            <Text c="dimmed">
              Dependency on billing webhook retries can delay final milestone.
            </Text>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </>
  );
}
