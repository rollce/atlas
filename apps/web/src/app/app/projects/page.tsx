import { Badge, Button, Card, Group, SimpleGrid, Text } from "@mantine/core";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

const projects = [
  {
    id: "atlas-redesign",
    name: "Atlas Redesign",
    status: "Active",
    tasks: 24,
    due: "Mar 26",
  },
  {
    id: "tenant-hardening",
    name: "Tenant Hardening",
    status: "Review",
    tasks: 14,
    due: "Mar 20",
  },
  {
    id: "billing-v2",
    name: "Billing V2",
    status: "Planning",
    tasks: 9,
    due: "Apr 01",
  },
];

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Workspace-level delivery tracking with status boards and client context."
        actions={
          <Button color="teal" leftSection={<IconPlus size={15} />}>
            Create project
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {projects.map((project) => (
          <Card key={project.id} withBorder radius="lg" p="lg" bg="dark.6">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{project.name}</Text>
              <Badge color={project.status === "Active" ? "teal" : "blue"}>
                {project.status}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              Tasks: {project.tasks}
            </Text>
            <Text c="dimmed" size="sm" mb="md">
              Due: {project.due}
            </Text>
            <Button
              component={Link}
              href={`/app/projects/${project.id}`}
              variant="light"
              color="teal"
              rightSection={<IconArrowRight size={14} />}
            >
              Open details
            </Button>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}
