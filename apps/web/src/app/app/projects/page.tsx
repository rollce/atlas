"use client";

import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowRight, IconPlus, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import { canManageWorkItems } from "@/lib/permissions";

type WorkspaceRecord = {
  id: string;
  name: string;
  key: string;
};

type ClientRecord = {
  id: string;
  name: string;
};

type ProjectRecord = {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  clientId: string | null;
  createdAt: string;
  workspace: WorkspaceRecord;
  client: ClientRecord | null;
  _count: {
    tasks: number;
  };
};

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 6;

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "teal";
    case "review":
      return "blue";
    case "done":
      return "green";
    default:
      return "gray";
  }
}

export default function ProjectsPage() {
  const { activeOrganizationId, activeRole, request } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationPayload | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState<string | null>(
    null,
  );
  const [createClientId, setCreateClientId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  const canCreateProjects = canManageWorkItems(activeRole);

  const loadReferences = useCallback(async () => {
    const [workspacePayload, clientPayload] = await Promise.all([
      request<{ workspaces: WorkspaceRecord[] }>(
        "/tenant/workspaces?page=1&limit=100",
        {
          tenant: true,
        },
      ),
      request<{ clients: ClientRecord[] }>("/tenant/clients?page=1&limit=100", {
        tenant: true,
      }),
    ]);

    setWorkspaces(workspacePayload.workspaces);
    setClients(clientPayload.clients);
    if (!createWorkspaceId) {
      setCreateWorkspaceId(workspacePayload.workspaces[0]?.id ?? null);
    }
  }, [createWorkspaceId, request]);

  const loadProjects = useCallback(async () => {
    if (!activeOrganizationId) {
      setProjects([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }

    try {
      const payload = await request<{
        projects: ProjectRecord[];
        pagination: PaginationPayload;
      }>(`/tenant/projects?${params.toString()}`, {
        tenant: true,
      });

      setProjects(payload.projects);
      setPagination(payload.pagination);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, page, request, search, sortBy, sortOrder]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }
    void loadReferences();
  }, [activeOrganizationId, loadReferences]);

  const workspaceOptions = useMemo(
    () =>
      workspaces.map((workspace) => ({
        value: workspace.id,
        label: workspace.name,
      })),
    [workspaces],
  );

  const clientOptions = useMemo(
    () => [
      { value: "", label: "No client" },
      ...clients.map((client) => ({
        value: client.id,
        label: client.name,
      })),
    ],
    [clients],
  );

  const createProject = async () => {
    if (!createWorkspaceId) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Select a workspace first",
      });
      return;
    }

    const name = createName.trim();
    if (name.length < 2) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Project name must contain at least 2 characters",
      });
      return;
    }

    setSubmitting(true);
    try {
      await request("/tenant/projects", {
        method: "POST",
        tenant: true,
        body: {
          name,
          workspaceId: createWorkspaceId,
          clientId: createClientId || null,
          status: createStatus,
        },
      });
      setCreateName("");
      setCreateClientId(null);
      setCreateStatus("active");
      setCreateOpen(false);
      setPage(1);
      await loadProjects();
      notifications.show({
        color: "teal",
        title: "Project created",
        message: "New project has been added",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Create failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Delivery tracking with tenant-safe filters, sorting, and pagination."
        actions={
          <Button
            color="teal"
            leftSection={<IconPlus size={15} />}
            onClick={() => setCreateOpen(true)}
            disabled={!canCreateProjects}
          >
            Create project
          </Button>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6" mb="lg">
        <Group align="flex-end" grow>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search projects..."
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(value) => setSortBy(value ?? "updatedAt")}
            data={[
              { value: "updatedAt", label: "Updated" },
              { value: "createdAt", label: "Created" },
              { value: "name", label: "Name" },
              { value: "status", label: "Status" },
            ]}
          />
          <Select
            label="Order"
            value={sortOrder}
            onChange={(value) => setSortOrder(value ?? "desc")}
            data={[
              { value: "desc", label: "Descending" },
              { value: "asc", label: "Ascending" },
            ]}
          />
          <Button variant="light" onClick={() => void loadProjects()}>
            Apply
          </Button>
        </Group>
      </Card>

      {loading ? (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <Skeleton h={190} radius="lg" />
          <Skeleton h={190} radius="lg" />
          <Skeleton h={190} radius="lg" />
        </SimpleGrid>
      ) : errorMessage ? (
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Stack gap="xs">
            <Text fw={600} c="red.4">
              Failed to load projects
            </Text>
            <Text c="dimmed" size="sm">
              {errorMessage}
            </Text>
            <Group>
              <Button variant="light" onClick={() => void loadProjects()}>
                Retry
              </Button>
            </Group>
          </Stack>
        </Card>
      ) : projects.length === 0 ? (
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text c="dimmed" ta="center" py="lg">
            No projects match this filter yet.
          </Text>
        </Card>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
            {projects.map((project) => (
              <Card key={project.id} withBorder radius="lg" p="lg" bg="dark.6">
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>{project.name}</Text>
                  <Badge color={statusColor(project.status)}>
                    {project.status}
                  </Badge>
                </Group>
                <Text c="dimmed" size="sm">
                  Workspace: {project.workspace.name}
                </Text>
                <Text c="dimmed" size="sm">
                  Client: {project.client?.name ?? "No client"}
                </Text>
                <Text c="dimmed" size="sm" mb="md">
                  Tasks: {project._count.tasks}
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

          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Showing {projects.length} of{" "}
              {pagination?.total ?? projects.length} projects
            </Text>
            <Pagination
              total={Math.max(1, pagination?.totalPages ?? 1)}
              value={page}
              onChange={setPage}
            />
          </Group>
        </>
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        centered
      >
        <Stack>
          <TextInput
            label="Project name"
            value={createName}
            onChange={(event) => setCreateName(event.currentTarget.value)}
          />
          <Select
            label="Workspace"
            value={createWorkspaceId}
            onChange={setCreateWorkspaceId}
            data={workspaceOptions}
          />
          <Select
            label="Client"
            value={createClientId ?? ""}
            onChange={(value) => setCreateClientId(value || null)}
            data={clientOptions}
          />
          <Select
            label="Status"
            value={createStatus}
            onChange={(value) => setCreateStatus(value ?? "active")}
            data={[
              { value: "active", label: "Active" },
              { value: "planning", label: "Planning" },
              { value: "review", label: "Review" },
            ]}
          />
          <Button color="teal" onClick={createProject} loading={submitting}>
            Create
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
