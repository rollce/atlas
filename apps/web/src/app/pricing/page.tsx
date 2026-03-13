import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  List,
  ListItem,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";

const plans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "For early teams",
    features: [
      "Up to 3 members",
      "2 active projects",
      "Basic task board",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$39/mo",
    subtitle: "For growing agencies",
    features: [
      "Up to 15 members",
      "Unlimited projects",
      "Client management",
      "Advanced permissions",
      "Audit logs",
    ],
  },
  {
    name: "Business",
    price: "$129/mo",
    subtitle: "For larger operations",
    features: [
      "Unlimited members",
      "Priority support",
      "Usage analytics",
      "Custom limits",
      "Dedicated onboarding",
    ],
  },
];

export default function PricingPage() {
  return (
    <Container size="lg" py={56}>
      <Group justify="space-between" mb="xl">
        <div>
          <Badge color="teal" variant="light" mb={8}>
            Billing Architecture
          </Badge>
          <Title order={1}>Pricing Plans</Title>
          <Text c="dimmed" mt={8}>
            Feature gates and usage limits wired for Free / Pro / Business
            subscriptions.
          </Text>
        </div>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {plans.map((plan) => (
          <Card key={plan.name} withBorder radius="lg" p="lg" bg="dark.7">
            <Text fw={700} size="xl">
              {plan.name}
            </Text>
            <Text c="teal.3" fw={700} size="2rem" mt={6}>
              {plan.price}
            </Text>
            <Text c="dimmed" size="sm" mb="md">
              {plan.subtitle}
            </Text>
            <List spacing="xs" mb="md">
              {plan.features.map((feature) => (
                <ListItem key={feature}>{feature}</ListItem>
              ))}
            </List>
            <Button
              variant={plan.name === "Pro" ? "filled" : "light"}
              color="teal"
              fullWidth
            >
              Select {plan.name}
            </Button>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
