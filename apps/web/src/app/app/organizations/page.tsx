"use client";

import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  Skeleton,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBuildingPlus,
  IconEdit,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import {
  canDeleteOrganization,
  canManageOrganization,
} from "@/lib/permissions";

const PER_PAGE = 6;

function roleColor(role: string): string {
  switch (role) {
    case "OWNER":
      return "teal";
    case "ADMIN":
      return "cyan";
    case "MANAGER":
      return "blue";
    default:
      return "gray";
  }
}

export default function OrganizationsPage() {
  const {
    status,
    organizations,
    activeOrganizationId,
    activeRole,
    reloadOrganizations,
    request,
  } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editName, setEditName] = useState("");
  const [editBillingEmail, setEditBillingEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  );

  const filteredOrganizations = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return organizations;
    }

    return organizations.filter((organization) =>
      [organization.name, organization.slug, organization.role]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [organizations, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrganizations.length / PER_PAGE),
  );
  const paginatedOrganizations = filteredOrganizations.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const canEditOrganization = canManageOrganization(activeRole);
  const canRemoveOrganization = canDeleteOrganization(activeRole);

  const openEditModal = () => {
    if (!activeOrganization) {
      return;
    }

    setEditName(activeOrganization.name);
    setEditBillingEmail("");
    setEditOpen(true);
  };

  const createOrganization = async () => {
    const name = createName.trim();
    if (name.length < 2) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Organization name must contain at least 2 characters",
      });
      return;
    }

    setSubmitting(true);
    try {
      await request<{ organization: { id: string } }>("/organizations", {
        method: "POST",
        body: { name },
      });
      await reloadOrganizations();
      setCreateOpen(false);
      setCreateName("");
      notifications.show({
        color: "teal",
        title: "Created",
        message: "Organization has been created",
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

  const updateOrganization = async () => {
    if (!activeOrganizationId) {
      return;
    }

    const name = editName.trim();
    if (name.length < 2) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Organization name must contain at least 2 characters",
      });
      return;
    }

    setSubmitting(true);
    try {
      await request<{ organization: { id: string } }>(
        `/organizations/${activeOrganizationId}`,
        {
          method: "PATCH",
          tenant: true,
          organizationId: activeOrganizationId,
          body: {
            name,
            billingEmail: editBillingEmail.trim() || null,
          },
        },
      );
      await reloadOrganizations();
      setEditOpen(false);
      notifications.show({
        color: "teal",
        title: "Updated",
        message: "Organization settings have been updated",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Update failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOrganization = async () => {
    if (!activeOrganizationId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete current organization? This action is permanent.",
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await request<{ success: boolean }>(
        `/organizations/${activeOrganizationId}`,
        {
          method: "DELETE",
          tenant: true,
          organizationId: activeOrganizationId,
        },
      );
      await reloadOrganizations();
      notifications.show({
        color: "teal",
        title: "Deleted",
        message: "Organization deleted successfully",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="Manage tenant entities, ownership, and access boundaries."
        actions={
          <Group>
            <Button
              leftSection={<IconBuildingPlus size={16} />}
              color="teal"
              onClick={() => setCreateOpen(true)}
            >
              New organization
            </Button>
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={openEditModal}
              disabled={!canEditOrganization || !activeOrganizationId}
            >
              Edit current
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={deleteOrganization}
              disabled={
                !canRemoveOrganization || !activeOrganizationId || submitting
              }
            >
              Delete current
            </Button>
          </Group>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Stack gap="md">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search by name, slug, or role"
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />

          {status === "loading" ? (
            <Stack>
              <Skeleton h={28} radius="sm" />
              <Skeleton h={28} radius="sm" />
              <Skeleton h={28} radius="sm" />
            </Stack>
          ) : filteredOrganizations.length === 0 ? (
            <Text c="dimmed" ta="center" py="lg">
              No organizations found for this filter.
            </Text>
          ) : (
            <>
              <Table striped highlightOnHover>
                <TableThead>
                  <TableTr>
                    <TableTh>Name</TableTh>
                    <TableTh>Slug</TableTh>
                    <TableTh>Role</TableTh>
                    <TableTh>Status</TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {paginatedOrganizations.map((organization) => (
                    <TableTr key={organization.id}>
                      <TableTd>{organization.name}</TableTd>
                      <TableTd>{organization.slug}</TableTd>
                      <TableTd>
                        <Badge
                          color={roleColor(organization.role)}
                          variant="light"
                        >
                          {organization.role}
                        </Badge>
                      </TableTd>
                      <TableTd>
                        <Badge
                          color={
                            organization.id === activeOrganizationId
                              ? "teal"
                              : "gray"
                          }
                        >
                          {organization.id === activeOrganizationId
                            ? "Active tenant"
                            : "Available"}
                        </Badge>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Showing {paginatedOrganizations.length} of{" "}
                  {filteredOrganizations.length} organizations
                </Text>
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={setPage}
                />
              </Group>
            </>
          )}
        </Stack>
      </Card>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create organization"
        centered
      >
        <Stack>
          <TextInput
            label="Organization name"
            placeholder="Northline Studio"
            value={createName}
            onChange={(event) => setCreateName(event.currentTarget.value)}
          />
          <Button
            color="teal"
            onClick={createOrganization}
            loading={submitting}
          >
            Create
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update current organization"
        centered
      >
        <Stack>
          <TextInput
            label="Organization name"
            value={editName}
            onChange={(event) => setEditName(event.currentTarget.value)}
          />
          <TextInput
            label="Billing email (optional)"
            placeholder="finance@rollsev.work"
            value={editBillingEmail}
            onChange={(event) => setEditBillingEmail(event.currentTarget.value)}
          />
          <Button
            color="teal"
            onClick={updateOrganization}
            loading={submitting}
          >
            Save changes
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
