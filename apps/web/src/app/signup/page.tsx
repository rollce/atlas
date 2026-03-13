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
import { apiRequest } from "@/lib/api";

const schema = z.object({
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("Denis Rollsev");
  const [organizationName, setOrganizationName] = useState("Rollsev Labs");
  const [email, setEmail] = useState("denis@rollsev.work");
  const [password, setPassword] = useState("Password123");

  return (
    <Container size={500} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2} mb={6}>
          Create Workspace
        </Title>
        <Text c="dimmed" size="sm" mb="lg">
          Bootstrap your organization and invite your team in minutes.
        </Text>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
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
                tokens: { sessionId: string };
              }>("/auth/register", {
                method: "POST",
                body: parsed.data,
              });

              document.cookie = `atlas_session=${payload.tokens.sessionId}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
              notifications.show({
                color: "teal",
                title: "Workspace created",
                message: "Welcome to Atlas",
              });
              router.push("/app/dashboard");
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
              label="Organization"
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
            <Button type="submit" color="teal" loading={loading}>
              Create account
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
