import {
  Avatar,
  Button,
  Card,
  Group,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile & Settings"
        subtitle="Personal preferences, security controls, and workspace defaults."
      />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Group mb="lg">
            <Avatar size={52} color="teal">
              DR
            </Avatar>
            <div>
              <Text fw={600}>Denis Rollsev</Text>
              <Text c="dimmed" size="sm">
                Owner • Atlas Demo Org
              </Text>
            </div>
          </Group>
          <TextInput label="Full name" defaultValue="Denis Rollsev" mb="sm" />
          <TextInput label="Email" defaultValue="denis@rollsev.work" mb="sm" />
          <Button color="teal">Save profile</Button>
        </Card>

        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text fw={600} mb="sm">
            Security
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            Rotate active sessions and enforce stronger login settings.
          </Text>
          <Button variant="light" color="teal" mb="sm" fullWidth>
            Revoke all sessions
          </Button>
          <Button variant="light" color="blue" fullWidth>
            Enable 2FA (next milestone)
          </Button>
        </Card>
      </SimpleGrid>
    </>
  );
}
