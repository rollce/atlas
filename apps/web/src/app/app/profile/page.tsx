"use client";

import {
  Avatar,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-store";
import type { UserSummary } from "@/lib/types";

type MeResponse = {
  user: UserSummary;
};

function initialsFromName(fullName?: string | null): string {
  if (!fullName) {
    return "AT";
  }

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "");

  return parts.join("") || "AT";
}

export default function ProfilePage() {
  const {
    status,
    user,
    activeRole,
    organizations,
    activeOrganizationId,
    request,
    updateUserProfile,
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const activeOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === activeOrganizationId,
      ),
    [activeOrganizationId, organizations],
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const payload = await request<MeResponse>("/auth/me");
        if (cancelled) {
          return;
        }

        setFullName(payload.user.fullName);
        setEmail(payload.user.email);
        updateUserProfile(payload.user);
      } catch (error) {
        if (cancelled) {
          return;
        }

        notifications.show({
          color: "red",
          title: "Profile load failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [request, status, updateUserProfile]);

  const saveProfile = async () => {
    const nextFullName = fullName.trim();
    const nextEmail = email.trim().toLowerCase();

    if (nextFullName.length < 2) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Full name must contain at least 2 characters",
      });
      return;
    }

    if (!nextEmail.includes("@")) {
      notifications.show({
        color: "red",
        title: "Validation",
        message: "Email is invalid",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = await request<MeResponse>("/auth/me", {
        method: "PATCH",
        body: {
          fullName: nextFullName,
          email: nextEmail,
        },
      });

      updateUserProfile(payload.user);
      setFullName(payload.user.fullName);
      setEmail(payload.user.email);

      notifications.show({
        color: "teal",
        title: "Profile updated",
        message: "Personal details saved successfully",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Save failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const revokeOtherSessions = async () => {
    setRevoking(true);
    try {
      const payload = await request<{ revokedCount: number }>(
        "/auth/sessions/revoke-all",
        {
          method: "POST",
        },
      );

      notifications.show({
        color: "teal",
        title: "Sessions revoked",
        message: `Revoked ${payload.revokedCount} active sessions`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Revoke failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Profile & Settings"
        subtitle="Personal preferences, security controls, and workspace defaults."
      />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          {loading ? (
            <Stack>
              <Skeleton h={60} radius="md" />
              <Skeleton h={44} radius="md" />
              <Skeleton h={44} radius="md" />
            </Stack>
          ) : (
            <>
              <Group mb="lg">
                <Avatar size={52} color="teal">
                  {initialsFromName(fullName || user?.fullName)}
                </Avatar>
                <div>
                  <Text fw={600}>
                    {fullName || user?.fullName || "Unknown user"}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {activeRole ?? "Member"} •{" "}
                    {activeOrganization?.name ?? "No organization"}
                  </Text>
                </div>
              </Group>
              <TextInput
                label="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.currentTarget.value)}
                mb="sm"
              />
              <TextInput
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                mb="sm"
              />
              <Button color="teal" loading={saving} onClick={saveProfile}>
                Save profile
              </Button>
            </>
          )}
        </Card>

        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text fw={600} mb="sm">
            Security
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            Rotate active sessions and enforce stronger login settings.
          </Text>
          <Button
            variant="light"
            color="teal"
            mb="sm"
            fullWidth
            loading={revoking}
            onClick={revokeOtherSessions}
          >
            Revoke other sessions
          </Button>
          <Button variant="light" color="blue" fullWidth>
            Enable 2FA (next milestone)
          </Button>
        </Card>
      </SimpleGrid>
    </>
  );
}
