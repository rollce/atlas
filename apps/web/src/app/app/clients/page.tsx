import {
  Avatar,
  Badge,
  Card,
  Group,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
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
          <TableThead>
            <TableTr>
              <TableTh>Client</TableTh>
              <TableTh>Primary contact</TableTh>
              <TableTh>Projects</TableTh>
              <TableTh>Risk</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            <TableTr>
              <TableTd>
                <Group gap="sm">
                  <Avatar color="teal">AN</Avatar>
                  <Text>Ardent North</Text>
                </Group>
              </TableTd>
              <TableTd>ops@ardentnorth.com</TableTd>
              <TableTd>4</TableTd>
              <TableTd>
                <Badge color="teal">Low</Badge>
              </TableTd>
            </TableTr>
            <TableTr>
              <TableTd>
                <Group gap="sm">
                  <Avatar color="blue">QS</Avatar>
                  <Text>Quasar Foods</Text>
                </Group>
              </TableTd>
              <TableTd>pm@quasarfoods.com</TableTd>
              <TableTd>2</TableTd>
              <TableTd>
                <Badge color="yellow">Medium</Badge>
              </TableTd>
            </TableTr>
          </TableTbody>
        </Table>
      </Card>
    </>
  );
}
