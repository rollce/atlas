"use client";

import {
  ActionIcon,
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
  AppShellSection,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuilding,
  IconChartHistogram,
  IconCreditCard,
  IconFileSearch,
  IconFolders,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconUserStar,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/app/organizations", label: "Organizations", icon: IconBuilding },
  { href: "/app/projects", label: "Projects", icon: IconFolders },
  { href: "/app/tasks", label: "Tasks", icon: IconMenu2 },
  { href: "/app/clients", label: "Clients", icon: IconUserStar },
  { href: "/app/members", label: "Members", icon: IconUsersGroup },
  { href: "/app/billing", label: "Billing", icon: IconCreditCard },
  { href: "/app/audit", label: "Audit", icon: IconFileSearch },
  { href: "/app/profile", label: "Profile", icon: IconSettings },
];

export function AtlasShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShellHeader>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
            />
            <Title order={4}>Atlas Workspace</Title>
            <Badge variant="light" color="teal">
              Multi-tenant MVP
            </Badge>
          </Group>
          <Group>
            <Select
              w={180}
              data={[
                { value: "atlas-demo", label: "Atlas Demo Org" },
                { value: "northline", label: "Northline Studio" },
              ]}
              defaultValue="atlas-demo"
              aria-label="Organization switcher"
            />
            <ActionIcon variant="light" color="teal" size="lg">
              <IconChartHistogram size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShellHeader>

      <AppShellNavbar p="md">
        <AppShellSection>
          <Text fw={700} size="sm" mb="sm" c="dimmed">
            Navigation
          </Text>
          <Stack gap={6}>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                active={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
                label={item.label}
                leftSection={
                  <ThemeIcon variant="light" color="teal" size={26}>
                    <item.icon size={15} />
                  </ThemeIcon>
                }
              />
            ))}
          </Stack>
        </AppShellSection>

        <Divider my="md" />

        <AppShellSection component={ScrollArea} grow>
          <Box
            p="sm"
            bd="1px solid var(--mantine-color-dark-4)"
            style={{ borderRadius: 12 }}
          >
            <Text fw={600} mb={4}>
              Plan Usage
            </Text>
            <Text size="sm" c="dimmed">
              Pro plan, 7/15 seats used, 21 active projects.
            </Text>
          </Box>
        </AppShellSection>

        <AppShellSection>
          <Button
            fullWidth
            variant="light"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => {
              document.cookie = "atlas_session=; Path=/; Max-Age=0";
              router.push("/login");
            }}
          >
            Logout
          </Button>
        </AppShellSection>
      </AppShellNavbar>

      <AppShellMain className="atlas-appear">{children}</AppShellMain>
    </AppShell>
  );
}
