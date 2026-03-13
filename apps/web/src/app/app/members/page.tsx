import { Avatar, Badge, Button, Card, Group, Table } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { PageHeader } from "@/components/page-header";

export default function MembersPage() {
  return (
    <>
      <PageHeader
        title="Members & Invitations"
        subtitle="Role management for owner/admin/manager/member with invitation lifecycle."
        actions={
          <Button color="teal" leftSection={<IconUserPlus size={15} />}>
            Invite member
          </Button>
        }
      />

      <Card withBorder radius="lg" p="lg" bg="dark.6">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Group>
                  <Avatar color="teal">DR</Avatar>
                  Denis Rollsev
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge color="teal">Owner</Badge>
              </Table.Td>
              <Table.Td>
                <Badge color="blue" variant="light">
                  Active
                </Badge>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Group>
                  <Avatar color="cyan">MP</Avatar>
                  Maria Petrova
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge color="grape">Manager</Badge>
              </Table.Td>
              <Table.Td>
                <Badge color="yellow" variant="light">
                  Invited
                </Badge>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
