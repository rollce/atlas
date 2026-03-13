import {
  Badge,
  Card,
  Group,
  ProgressLabel,
  ProgressRoot,
  ProgressSection,
  RingProgress,
  SimpleGrid,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
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
          <ProgressRoot size={24} radius="xl">
            <ProgressSection value={62} color="teal">
              <ProgressLabel>Build</ProgressLabel>
            </ProgressSection>
            <ProgressSection value={24} color="blue">
              <ProgressLabel>Review</ProgressLabel>
            </ProgressSection>
            <ProgressSection value={14} color="gray">
              <ProgressLabel>Backlog</ProgressLabel>
            </ProgressSection>
          </ProgressRoot>

          <Table mt="lg" striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Workspace</TableTh>
                <TableTh>On-time</TableTh>
                <TableTh>Overdue</TableTh>
                <TableTh>Utilization</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              <TableTr>
                <TableTd>Atlas Demo Org</TableTd>
                <TableTd>82%</TableTd>
                <TableTd>8</TableTd>
                <TableTd>74%</TableTd>
              </TableTr>
              <TableTr>
                <TableTd>Northline Studio</TableTd>
                <TableTd>77%</TableTd>
                <TableTd>11</TableTd>
                <TableTd>69%</TableTd>
              </TableTr>
            </TableTbody>
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
