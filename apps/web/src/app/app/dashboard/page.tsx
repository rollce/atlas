import {
  Badge,
  Card,
  Group,
  Progress,
  RingProgress,
  SimpleGrid,
  Table,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";

const kpis = [
  { label: "Active organizations", value: "12", trend: "+18%" },
  { label: "Open projects", value: "46", trend: "+11%" },
  { label: "Tasks due this week", value: "93", trend: "-4%" },
  { label: "Invites pending", value: "7", trend: "+2" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Portfolio Control Center"
        subtitle="High-level metrics for tenant growth, team activity, and delivery health."
      />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} mb="lg">
        {kpis.map((item) => (
          <Card key={item.label} withBorder radius="lg" p="lg" bg="dark.6">
            <Text c="dimmed" size="sm" mb={6}>
              {item.label}
            </Text>
            <Group justify="space-between">
              <Text fw={700} size="1.8rem">
                {item.value}
              </Text>
              <Badge
                color={item.trend.startsWith("-") ? "red" : "teal"}
                variant="light"
              >
                {item.trend}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 3 }}>
        <Card
          withBorder
          radius="lg"
          p="lg"
          bg="dark.6"
          style={{ gridColumn: "span 2" }}
        >
          <Text fw={600} mb="md">
            Delivery Velocity
          </Text>
          <Progress.Root size={24} radius="xl">
            <Progress.Section value={62} color="teal">
              <Progress.Label>Build</Progress.Label>
            </Progress.Section>
            <Progress.Section value={24} color="blue">
              <Progress.Label>Review</Progress.Label>
            </Progress.Section>
            <Progress.Section value={14} color="gray">
              <Progress.Label>Backlog</Progress.Label>
            </Progress.Section>
          </Progress.Root>

          <Table mt="lg" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Workspace</Table.Th>
                <Table.Th>On-time</Table.Th>
                <Table.Th>Overdue</Table.Th>
                <Table.Th>Utilization</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Atlas Demo Org</Table.Td>
                <Table.Td>82%</Table.Td>
                <Table.Td>8</Table.Td>
                <Table.Td>74%</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Northline Studio</Table.Td>
                <Table.Td>77%</Table.Td>
                <Table.Td>11</Table.Td>
                <Table.Td>69%</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="lg" p="lg" bg="dark.6">
          <Text fw={600} mb="sm">
            Plan Consumption
          </Text>
          <RingProgress
            size={180}
            thickness={16}
            sections={[
              { value: 72, color: "teal" },
              { value: 18, color: "cyan" },
              { value: 10, color: "gray" },
            ]}
            label={
              <Text ta="center" fw={700}>
                72%
              </Text>
            }
            mx="auto"
          />
          <Text c="dimmed" size="sm" ta="center" mt="md">
            72% of Pro plan capacity is currently used.
          </Text>
        </Card>
      </SimpleGrid>
    </>
  );
}
