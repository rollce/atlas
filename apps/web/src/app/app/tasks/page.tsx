"use client";

import {
  Badge,
  Button,
  Card,
  Grid,
  GridCol,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import { canManageWorkItems } from "@/lib/permissions";

type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  version: number;
  project: {
    id: string;
    name: string;
    status: string;
  };
};

type ProjectRecord = {
  id: string;
  name: string;
};

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 24;

const BOARD_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
] as const;

type BoardColumnKey = (typeof BOARD_COLUMNS)[number]["key"];

function normalizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized;
}

export default function TasksPage() {
  const { activeOrganizationId, activeRole, request } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationPayload | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState("todo");
  const [createDueDate, setCreateDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canCreateTasks = canManageWorkItems(activeRole);

  const loadProjects = useCallback(async () => {
    const payload = await request<{ projects: ProjectRecord[] }>(
      "/tenant/projects?page=1&limit=100&sortBy=updatedAt&sortOrder=desc",
      { tenant: true },
    );

    setProjects(payload.projects);
    if (!createProjectId) {
      setCreateProjectId(payload.projects[0]?.id ?? null);
    }
  }, [createProjectId, request]);

  const loadTasks = useCallback(async () => {
    if (!activeOrganizationId) {
      setTasks([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (statusFilter) {
      params.set("status", statusFilter);
    }

    try {
      const payload = await request<{
        tasks: TaskRecord[];
        pagination: PaginationPayload;
      }>(`/tenant/tasks?${params.toString()}`, {
        tenant: true,
      });

      setTasks(payload.tasks);
      setPagination(payload.pagination);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, page, request, search, statusFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }
    void loadProjects();
  }, [activeOrganizationId, loadProjects]);

  const columns = useMemo(() => {
    const map: Record<BoardColumnKey, TaskRecord[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const task of tasks) {
      const key = normalizeStatus(task.status);
      if (!(key in map)) {
        map.todo.push(task);
      } else {
        map[key as BoardColumnKey].push(task);
      }
    }

    return map;
  }, [tasks]);

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({ value: project.id, label: project.name })),
    [projects],
  );

  const createTask = async () => {
    if (!createProjectId) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Select a project first",
      });
      return;
    }

    const title = createTitle.trim();
    if (title.length < 2) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Task title must contain at least 2 characters",
      });
      return;
    }

    setSubmitting(true);
    try {
      await request("/tenant/tasks", {
        method: "POST",
        tenant: true,
        body: {
          projectId: createProjectId,
          title,
          description: createDescription.trim() || undefined,
          status: createStatus,
          dueDate: createDueDate
            ? new Date(`${createDueDate}T00:00:00.000Z`).toISOString()
            : undefined,
        },
      });

      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateStatus("todo");
      setCreateDueDate("");
      setPage(1);
      await loadTasks();
      notifications.show({
        color: "teal",
        title: "Task created",
        message: "New task has been added to the board",
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
        title="Tasks Board"
        subtitle="Kanban board backed by tenant API with filters, due dates, and pagination."
        actions={
          <Button
            color="teal"
            leftSection={<IconPlus size={15} />}
            onClick={() => setCreateOpen(true)}
            disabled={!canCreateTasks}
          >
            Create task
          </Button>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6" mb="lg">
        <Group align="flex-end" grow>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search tasks..."
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value ?? "");
              setPage(1);
            }}
            data={[
              { value: "", label: "All statuses" },
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "review", label: "Review" },
              { value: "done", label: "Done" },
            ]}
          />
          <Button variant="light" onClick={() => void loadTasks()}>
            Apply
          </Button>
        </Group>
      </Card>

      {loading ? (
        <Grid>
          <GridCol span={{ base: 12, md: 6, xl: 3 }}>
            <Skeleton h={360} radius="lg" />
          </GridCol>
          <GridCol span={{ base: 12, md: 6, xl: 3 }}>
            <Skeleton h={360} radius="lg" />
          </GridCol>
          <GridCol span={{ base: 12, md: 6, xl: 3 }}>
            <Skeleton h={360} radius="lg" />
          </GridCol>
          <GridCol span={{ base: 12, md: 6, xl: 3 }}>
            <Skeleton h={360} radius="lg" />
          </GridCol>
        </Grid>
      ) : errorMessage ? (
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Stack gap="xs">
            <Text fw={600} c="red.4">
              Failed to load tasks
            </Text>
            <Text c="dimmed" size="sm">
              {errorMessage}
            </Text>
            <Group>
              <Button variant="light" onClick={() => void loadTasks()}>
                Retry
              </Button>
            </Group>
          </Stack>
        </Card>
      ) : tasks.length === 0 ? (
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text c="dimmed" ta="center" py="lg">
            No tasks found for the selected filters.
          </Text>
        </Card>
      ) : (
        <>
          <Grid>
            {BOARD_COLUMNS.map((column) => (
              <GridCol key={column.key} span={{ base: 12, md: 6, xl: 3 }}>
                <Card withBorder radius="lg" p="md" bg="dark.6" h="100%">
                  {(() => {
                    const columnTasks = columns[column.key];
                    return (
                      <>
                        <Group justify="space-between" mb="sm">
                          <Text fw={600}>{column.label}</Text>
                          <Badge variant="light" color="teal">
                            {columnTasks.length}
                          </Badge>
                        </Group>
                        <ScrollArea h={420}>
                          <Stack>
                            {columnTasks.map((task) => (
                              <Card
                                key={task.id}
                                withBorder
                                radius="md"
                                p="sm"
                                bg="dark.5"
                              >
                                <Text size="sm" fw={600}>
                                  {task.title}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Project: {task.project.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Due:{" "}
                                  {task.dueDate
                                    ? new Date(
                                        task.dueDate,
                                      ).toLocaleDateString()
                                    : "No due date"}
                                </Text>
                              </Card>
                            ))}
                          </Stack>
                        </ScrollArea>
                      </>
                    );
                  })()}
                </Card>
              </GridCol>
            ))}
          </Grid>

          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Showing {tasks.length} of {pagination?.total ?? tasks.length}{" "}
              tasks
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
        title="Create task"
        centered
      >
        <Stack>
          <TextInput
            label="Title"
            value={createTitle}
            onChange={(event) => setCreateTitle(event.currentTarget.value)}
          />
          <Textarea
            label="Description"
            value={createDescription}
            onChange={(event) =>
              setCreateDescription(event.currentTarget.value)
            }
          />
          <Select
            label="Project"
            value={createProjectId}
            onChange={setCreateProjectId}
            data={projectOptions}
          />
          <Select
            label="Status"
            value={createStatus}
            onChange={(value) => setCreateStatus(value ?? "todo")}
            data={[
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "review", label: "Review" },
              { value: "done", label: "Done" },
            ]}
          />
          <TextInput
            type="date"
            label="Due date"
            value={createDueDate}
            onChange={(event) => setCreateDueDate(event.currentTarget.value)}
          />
          <Button color="teal" onClick={createTask} loading={submitting}>
            Create
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
