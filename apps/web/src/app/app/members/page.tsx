"use client";

import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
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
import { IconMailPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import { canManageMembers } from "@/lib/permissions";

type MemberRecord = {
  id: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    emailVerified: string | null;
  };
};

type InvitationRecord = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";
  expiresAt: string;
  createdAt: string;
};

function getRoleColor(role: string) {
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

export default function MembersPage() {
  const { activeOrganizationId, activeRole, request } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [submitting, setSubmitting] = useState(false);

  const canInvite = canManageMembers(activeRole);

  const loadData = useCallback(async () => {
    if (!activeOrganizationId) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [membersPayload, invitationsPayload] = await Promise.all([
        request<{ members: MemberRecord[] }>("/tenant/members", {
          tenant: true,
        }),
        request<{ invitations: InvitationRecord[] }>("/tenant/invitations", {
          tenant: true,
        }),
      ]);

      setMembers(membersPayload.members);
      setInvitations(invitationsPayload.invitations);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, request]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo(() => {
    const memberRows = members.map((member) => ({
      key: member.id,
      type: "member" as const,
      name: member.user.fullName,
      email: member.user.email,
      role: member.role,
      status: member.user.emailVerified ? "Active" : "Pending verification",
    }));

    const invitationRows = invitations.map((invitation) => ({
      key: invitation.id,
      type: "invitation" as const,
      name: invitation.email,
      email: invitation.email,
      role: invitation.role,
      status: "Invited",
    }));

    return [...memberRows, ...invitationRows];
  }, [invitations, members]);

  const sendInvitation = async () => {
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Enter a valid email address",
      });
      return;
    }

    setSubmitting(true);
    try {
      await request("/tenant/invitations", {
        method: "POST",
        tenant: true,
        body: {
          email,
          role: inviteRole,
        },
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      await loadData();
      notifications.show({
        color: "teal",
        title: "Invitation sent",
        message: `${email} was invited successfully`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Invite failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Members & Invitations"
        subtitle="Manage team access by role and track pending invitations."
        actions={
          <Button
            color="teal"
            leftSection={<IconMailPlus size={15} />}
            disabled={!canInvite}
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </Button>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        {loading ? (
          <Stack>
            <Skeleton h={28} radius="sm" />
            <Skeleton h={28} radius="sm" />
            <Skeleton h={28} radius="sm" />
          </Stack>
        ) : errorMessage ? (
          <Stack gap="xs">
            <Text fw={600} c="red.4">
              Failed to load members
            </Text>
            <Text c="dimmed" size="sm">
              {errorMessage}
            </Text>
            <Group>
              <Button variant="light" onClick={() => void loadData()}>
                Retry
              </Button>
            </Group>
          </Stack>
        ) : rows.length === 0 ? (
          <Text c="dimmed" ta="center" py="lg">
            No members or invitations yet. Invite your first collaborator.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>User</TableTh>
                <TableTh>Role</TableTh>
                <TableTh>Status</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((row) => (
                <TableTr key={row.key}>
                  <TableTd>
                    <Group>
                      <Avatar color={row.type === "member" ? "teal" : "blue"}>
                        {row.name.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {row.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {row.email}
                        </Text>
                      </Stack>
                    </Group>
                  </TableTd>
                  <TableTd>
                    <Badge color={getRoleColor(row.role)} variant="light">
                      {row.role}
                    </Badge>
                  </TableTd>
                  <TableTd>
                    <Badge
                      color={row.status === "Invited" ? "yellow" : "teal"}
                      variant="light"
                    >
                      {row.status}
                    </Badge>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        centered
      >
        <Stack>
          <TextInput
            label="Email"
            placeholder="teammate@company.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.currentTarget.value)}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(value) => setInviteRole(value ?? "MEMBER")}
            data={[
              { value: "ADMIN", label: "Admin" },
              { value: "MANAGER", label: "Manager" },
              { value: "MEMBER", label: "Member" },
            ]}
          />
          <Button color="teal" onClick={sendInvitation} loading={submitting}>
            Send invitation
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
