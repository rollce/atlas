import {
  Badge,
  Card,
  Group,
  List,
  ListItem,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
} from "@mantine/core";
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
          <TabsList>
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="activity">Activity</TabsTab>
            <TabsTab value="risks">Risks</TabsTab>
          </TabsList>

          <TabsPanel value="overview" pt="md">
            <Text c="dimmed" mb="sm">
              Tenant-safe project details are loaded by organization + workspace
              scope.
            </Text>
            <List spacing="xs">
              <ListItem>24 tasks total, 15 completed</ListItem>
              <ListItem>4 collaborators, 2 client stakeholders</ListItem>
              <ListItem>Next milestone in 4 days</ListItem>
            </List>
          </TabsPanel>

          <TabsPanel value="activity" pt="md">
            <Text c="dimmed">
              Recent actions: status updates, assignment changes, due-date
              edits.
            </Text>
          </TabsPanel>

          <TabsPanel value="risks" pt="md">
            <Text c="dimmed">
              Dependency on billing webhook retries can delay final milestone.
            </Text>
          </TabsPanel>
        </Tabs>
      </Card>
    </>
  );
}
