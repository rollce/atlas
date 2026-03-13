"use client";

import {
  Button,
  Card,
  Container,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Container size={440} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2}>Forgot password</Title>
        <Text c="dimmed" size="sm" mb="lg">
          We will generate a reset token (mock flow in development).
        </Text>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            try {
              const result = await apiRequest<{
                mockResetToken?: string;
                message: string;
              }>("/auth/forgot-password", {
                method: "POST",
                body: { email },
              });

              notifications.show({
                color: "teal",
                title: "Request accepted",
                message: result.mockResetToken
                  ? `Mock token: ${result.mockResetToken.slice(0, 16)}...`
                  : result.message,
              });
            } catch (error) {
              notifications.show({
                color: "red",
                title: "Error",
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
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <Button type="submit" color="teal" loading={loading}>
              Generate token
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
