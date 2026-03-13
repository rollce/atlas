import { Avatar, Badge, Card, Group, Table, Text } from "@mantine/core";
import { PageHeader } from "@/components/page-header";

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Client records connected to projects for delivery visibility and priority handling."
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Client</Table.Th>
              <Table.Th>Primary contact</Table.Th>
              <Table.Th>Projects</Table.Th>
              <Table.Th>Risk</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Group gap="sm">
                  <Avatar color="teal">AN</Avatar>
                  <Text>Ardent North</Text>
                </Group>
              </Table.Td>
              <Table.Td>ops@ardentnorth.com</Table.Td>
              <Table.Td>4</Table.Td>
              <Table.Td>
                <Badge color="teal">Low</Badge>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Group gap="sm">
                  <Avatar color="blue">QS</Avatar>
                  <Text>Quasar Foods</Text>
                </Group>
              </Table.Td>
              <Table.Td>pm@quasarfoods.com</Table.Td>
              <Table.Td>2</Table.Td>
              <Table.Td>
                <Badge color="yellow">Medium</Badge>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
