import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
} from "@mantine/core";
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
          <TableThead>
            <TableTr>
              <TableTh>User</TableTh>
              <TableTh>Role</TableTh>
              <TableTh>Status</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            <TableTr>
              <TableTd>
                <Group>
                  <Avatar color="teal">DR</Avatar>
                  Denis Rollsev
                </Group>
              </TableTd>
              <TableTd>
                <Badge color="teal">Owner</Badge>
              </TableTd>
              <TableTd>
                <Badge color="blue" variant="light">
                  Active
                </Badge>
              </TableTd>
            </TableTr>
            <TableTr>
              <TableTd>
                <Group>
                  <Avatar color="cyan">MP</Avatar>
                  Maria Petrova
                </Group>
              </TableTd>
              <TableTd>
                <Badge color="grape">Manager</Badge>
              </TableTd>
              <TableTd>
                <Badge color="yellow" variant="light">
                  Invited
                </Badge>
              </TableTd>
            </TableTr>
          </TableTbody>
        </Table>
      </Card>
    </>
  );
}
