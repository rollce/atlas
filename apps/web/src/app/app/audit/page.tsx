import {
  Badge,
  Card,
  Group,
  Text,
  Timeline,
  TimelineItem,
} from "@mantine/core";
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
          <TimelineItem title="Role updated">
            <Group gap={8}>
              <Badge color="teal" variant="light">
                RBAC
              </Badge>
              <Text size="sm" c="dimmed">
                Maria Petrova promoted to Manager in Atlas Demo Org.
              </Text>
            </Group>
          </TimelineItem>
          <TimelineItem title="Invitation accepted">
            <Text size="sm" c="dimmed">
              `dev@northline.studio` accepted organization invite.
            </Text>
          </TimelineItem>
          <TimelineItem title="Plan upgraded">
            <Text size="sm" c="dimmed">
              Subscription switched from Free to Pro after usage limit reached.
            </Text>
          </TimelineItem>
          <TimelineItem title="Password reset requested">
            <Text size="sm" c="dimmed">
              Auth security event logged for owner account.
            </Text>
          </TimelineItem>
        </Timeline>
      </Card>
    </>
  );
}
