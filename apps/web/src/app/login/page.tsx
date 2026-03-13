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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type {
  OrganizationSummary,
  SessionTokens,
  UserSummary,
} from "@/lib/types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeAuthSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("owner@atlas.demo");
  const [password, setPassword] = useState("Password123");

  return (
    <Container size={460} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2} mb={6}>
          Sign in to Atlas
        </Title>
        <Text c="dimmed" size="sm" mb="lg">
          Access tenant dashboard, projects, billing, and audit logs.
        </Text>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const parsed = schema.safeParse({ email, password });
            if (!parsed.success) {
              notifications.show({
                color: "red",
                title: "Validation",
                message: "Invalid credentials format",
              });
              return;
            }

            setLoading(true);
            try {
              const payload = await apiRequest<{
                user: UserSummary;
                organizations: OrganizationSummary[];
                tokens: SessionTokens;
              }>("/auth/login", {
                method: "POST",
                body: parsed.data,
              });

              completeAuthSession({
                user: payload.user,
                tokens: payload.tokens,
                organizations: payload.organizations,
              });
              notifications.show({
                color: "teal",
                title: "Welcome",
                message: "Signed in successfully",
              });

              const redirect = searchParams.get("redirect");
              if (redirect && redirect.startsWith("/app")) {
                router.push(redirect);
                return;
              }

              router.push("/app/dashboard");
            } catch (error) {
              notifications.show({
                color: "red",
                title: "Login failed",
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
              label="Email"
              placeholder="owner@atlas.demo"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Password123"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            <Button type="submit" color="teal" loading={loading}>
              Login
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}

function LoginFallback() {
  return (
    <Container size={460} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2} mb={6}>
          Sign in to Atlas
        </Title>
        <Text c="dimmed" size="sm">
          Loading login form...
        </Text>
      </Card>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
