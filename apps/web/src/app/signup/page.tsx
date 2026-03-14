"use client";

import {
  Button,
  Card,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { AltchaWidget } from "@/components/altcha-widget";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type {
  OrganizationSummary,
  SessionTokens,
  UserSummary,
} from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(2),
  organizationName: z.string().trim().max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function SignupPage() {
  const router = useRouter();
  const { completeAuthSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectToApp = (targetPath: string) => {
    router.replace(targetPath);
    if (typeof window !== "undefined") {
      window.location.assign(targetPath);
    }
  };

  return (
    <Container size={500} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2} mb={6}>
          Create account
        </Title>
        <Text c="dimmed" size="sm" mb="lg">
          Sign up as a client and create your workspace in one step.
        </Text>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const altchaPayload = formData.get("altcha");
            if (
              typeof altchaPayload !== "string" ||
              altchaPayload.length < 20
            ) {
              notifications.show({
                color: "red",
                title: "Verification required",
                message: "Please complete the ALTCHA verification first",
              });
              return;
            }

            const parsed = schema.safeParse({
              fullName,
              organizationName,
              email,
              password,
            });
            if (!parsed.success) {
              notifications.show({
                color: "red",
                title: "Validation",
                message: "Check form fields",
              });
              return;
            }

            setLoading(true);
            try {
              const payload = await apiRequest<{
                user: UserSummary;
                organization: {
                  id: string;
                  name: string;
                  slug: string;
                };
                tokens: SessionTokens;
              }>("/auth/register", {
                method: "POST",
                body: {
                  ...parsed.data,
                  organizationName:
                    parsed.data.organizationName &&
                    parsed.data.organizationName.length > 0
                      ? parsed.data.organizationName
                      : undefined,
                  altcha: altchaPayload,
                },
              });

              const organizations: OrganizationSummary[] = [
                {
                  id: payload.organization.id,
                  name: payload.organization.name,
                  slug: payload.organization.slug,
                  role: "OWNER",
                },
              ];

              completeAuthSession({
                user: payload.user,
                tokens: payload.tokens,
                organizations,
                activeOrganizationId: payload.organization.id,
              });

              notifications.show({
                color: "teal",
                title: "Workspace created",
                message: "Welcome to Atlas",
              });
              redirectToApp("/app/dashboard");
            } catch (error) {
              notifications.show({
                color: "red",
                title: "Sign up failed",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          <Stack>
            <TextInput
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.currentTarget.value)}
            />
            <TextInput
              label="Organization (optional)"
              placeholder="Your company or team name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.currentTarget.value)}
            />
            <TextInput
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <AltchaWidget />
            <Button type="submit" color="teal" loading={loading}>
              Create account
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
