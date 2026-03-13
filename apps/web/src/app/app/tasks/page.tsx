import {
  Badge,
  Card,
  Grid,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";

const columns = {
  todo: ["Define migration strategy", "Add tenant policy checks"],
  inProgress: ["Auth token rotation", "Client table pagination"],
  review: ["Billing limits middleware"],
  done: ["Health endpoints", "Queue worker baseline"],
};

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="Tasks Board"
        subtitle="Kanban-style view for planning, execution, and review across workspaces."
      />

      <Grid>
        {Object.entries(columns).map(([column, items]) => (
          <Grid.Col key={column} span={{ base: 12, md: 6, xl: 3 }}>
            <Card withBorder radius="lg" p="md" bg="dark.6" h="100%">
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{column}</Text>
                <Badge variant="light" color="teal">
                  {items.length}
                </Badge>
              </Group>
              <ScrollArea h={380}>
                <Stack>
                  {items.map((item) => (
                    <Card key={item} withBorder radius="md" p="sm" bg="dark.5">
                      <Text size="sm">{item}</Text>
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </>
  );
}
