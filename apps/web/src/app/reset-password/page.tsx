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
import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Container size={440} py={80}>
      <Card withBorder radius="lg" p="xl" bg="dark.7">
        <Title order={2}>Reset password</Title>
        <Text c="dimmed" size="sm" mb="lg">
          Complete password reset with token generated from forgot-password
          flow.
        </Text>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            try {
              await apiRequest("/auth/reset-password", {
                method: "POST",
                body: { token, newPassword },
              });
              notifications.show({
                color: "teal",
                title: "Success",
                message: "Password updated",
              });
              setToken("");
              setNewPassword("");
            } catch (error) {
              notifications.show({
                color: "red",
                title: "Reset failed",
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
              label="Reset token"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
            />
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
            />
            <Button type="submit" color="teal" loading={loading}>
              Update password
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
