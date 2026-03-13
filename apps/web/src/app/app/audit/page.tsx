import { Badge, Card, Group, Text, Timeline } from "@mantine/core";
import { PageHeader } from "@/components/page-header";

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Critical actions timeline: auth events, role changes, and billing updates."
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Timeline active={3} bulletSize={18} lineWidth={2}>
          <Timeline.Item title="Role updated">
            <Group gap={8}>
              <Badge color="teal" variant="light">
                RBAC
              </Badge>
              <Text size="sm" c="dimmed">
                Maria Petrova promoted to Manager in Atlas Demo Org.
              </Text>
            </Group>
          </Timeline.Item>
          <Timeline.Item title="Invitation accepted">
            <Text size="sm" c="dimmed">
              `dev@northline.studio` accepted organization invite.
            </Text>
          </Timeline.Item>
          <Timeline.Item title="Plan upgraded">
            <Text size="sm" c="dimmed">
              Subscription switched from Free to Pro after usage limit reached.
            </Text>
          </Timeline.Item>
          <Timeline.Item title="Password reset requested">
            <Text size="sm" c="dimmed">
              Auth security event logged for owner account.
            </Text>
          </Timeline.Item>
        </Timeline>
      </Card>
    </>
  );
}
