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
  email: z.string().email(),
  password: z.string().min(8),
});

export default function LoginPage() {
  const router = useRouter();
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
                tokens: { sessionId: string };
              }>("/auth/login", {
                method: "POST",
                body: parsed.data,
              });

              document.cookie = `atlas_session=${payload.tokens.sessionId}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
              notifications.show({
                color: "teal",
                title: "Welcome",
                message: "Signed in successfully",
              });
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
