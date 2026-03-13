import { Badge, Button, Card, Table, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { PageHeader } from "@/components/page-header";

export default function OrganizationsPage() {
  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="Manage tenant-level identity, owner assignment, and plan coverage."
        actions={
          <Button leftSection={<IconPlus size={16} />} color="teal">
            New organization
          </Button>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Plan</Table.Th>
              <Table.Th>Members</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Atlas Demo Org</Table.Td>
              <Table.Td>Pro</Table.Td>
              <Table.Td>7</Table.Td>
              <Table.Td>
                <Badge color="teal">Healthy</Badge>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Northline Studio</Table.Td>
              <Table.Td>Business</Table.Td>
              <Table.Td>19</Table.Td>
              <Table.Td>
                <Badge color="blue">Scaling</Badge>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        <Text c="dimmed" size="sm" mt="md">
          Tenant switcher in header is wired to this entity list.
        </Text>
      </Card>
    </>
  );
}
