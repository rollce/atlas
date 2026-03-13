import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" mb="lg">
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        <Text c="dimmed" maw={780}>
          {subtitle}
        </Text>
      </Stack>
      {actions}
    </Group>
  );
}
