"use client";

import {
  Badge,
  Card,
  Group,
  List,
  ListItem,
  Skeleton,
  Stack,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
} from "@mantine/core";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";

type ProjectDetails = {
  id: string;
  name: string;
  status: string;
  workspace: {
    id: string;
    name: string;
    key: string;
  };
  client: {
    id: string;
    name: string;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }>;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { request } = useAuth();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const payload = await request<{ project: ProjectDetails }>(
          `/tenant/projects/${projectId}`,
          {
            tenant: true,
          },
        );
        setProject(payload.project);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProject();
  }, [projectId, request]);

  if (loading) {
    return (
      <Stack>
        <Skeleton h={34} w={280} radius="sm" />
        <Skeleton h={280} radius="lg" />
      </Stack>
    );
  }

  if (!project || errorMessage) {
    return (
      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Text fw={600} c="red.4">
          Failed to load project
        </Text>
        <Text c="dimmed" size="sm" mt={4}>
          {errorMessage ?? "Project was not found in tenant scope"}
        </Text>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`Project: ${project.name}`}
        subtitle="Detailed tenant-safe project view with latest task activity."
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Group mb="md">
          <Badge color="teal">{project.status}</Badge>
          <Badge color="blue" variant="light">
            Workspace: {project.workspace.name}
          </Badge>
          <Badge color="grape" variant="light">
            Client: {project.client?.name ?? "No client"}
          </Badge>
        </Group>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="activity">Recent Tasks</TabsTab>
            <TabsTab value="notes">Notes</TabsTab>
          </TabsList>

          <TabsPanel value="overview" pt="md">
            <List spacing="xs">
              <ListItem>Workspace key: {project.workspace.key}</ListItem>
              <ListItem>Project ID: {project.id}</ListItem>
              <ListItem>
                Loaded in tenant-safe scope via x-organization-id
              </ListItem>
            </List>
          </TabsPanel>

          <TabsPanel value="activity" pt="md">
            {project.tasks.length === 0 ? (
              <Text c="dimmed">No tasks created for this project yet.</Text>
            ) : (
              <List spacing="xs">
                {project.tasks.map((task) => (
                  <ListItem key={task.id}>
                    {task.title} ({task.status})
                    {task.dueDate
                      ? ` · due ${new Date(task.dueDate).toLocaleDateString()}`
                      : ""}
                  </ListItem>
                ))}
              </List>
            )}
          </TabsPanel>

          <TabsPanel value="notes" pt="md">
            <Text c="dimmed">
              This view is connected to live backend entities and can be
              extended with comments/files in the next iteration.
            </Text>
          </TabsPanel>
        </Tabs>
      </Card>
    </>
  );
}
