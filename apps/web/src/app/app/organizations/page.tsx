import {
  Badge,
  Button,
  Card,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
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
          <TableThead>
            <TableTr>
              <TableTh>Name</TableTh>
              <TableTh>Plan</TableTh>
              <TableTh>Members</TableTh>
              <TableTh>Status</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            <TableTr>
              <TableTd>Atlas Demo Org</TableTd>
              <TableTd>Pro</TableTd>
              <TableTd>7</TableTd>
              <TableTd>
                <Badge color="teal">Healthy</Badge>
              </TableTd>
            </TableTr>
            <TableTr>
              <TableTd>Northline Studio</TableTd>
              <TableTd>Business</TableTd>
              <TableTd>19</TableTd>
              <TableTd>
                <Badge color="blue">Scaling</Badge>
              </TableTd>
            </TableTr>
          </TableTbody>
        </Table>
        <Text c="dimmed" size="sm" mt="md">
          Tenant switcher in header is wired to this entity list.
        </Text>
      </Card>
    </>
  );
}
