"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { AtlasShell } from "./atlas-shell";

export function ProtectedApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  useEffect(() => {
    if (status !== "anonymous") {
      return;
    }

    const redirectTarget = pathname.startsWith("/app")
      ? pathname
      : "/app/dashboard";
    const search = new URLSearchParams({ redirect: redirectTarget }).toString();
    router.replace(`/login?${search}`);
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return (
      <Center mih="70vh">
        <Stack align="center" gap="xs">
          <Loader color="teal" />
          <Text size="sm" c="dimmed">
            Bootstrapping session...
          </Text>
        </Stack>
      </Center>
    );
  }

  return <AtlasShell>{children}</AtlasShell>;
}
