import { PrismaClient, PlanCode, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@atlas.demo" },
    update: {},
    create: {
      email: "owner@atlas.demo",
      passwordHash: "demo_hash_replace_in_real_env",
      fullName: "Atlas Owner",
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "atlas-demo" },
    update: {},
    create: {
      slug: "atlas-demo",
      name: "Atlas Demo Org",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      organizationId: organization.id,
      role: Role.OWNER,
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planCode: PlanCode.PRO,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  console.log("Seed data created:", {
    organization: organization.slug,
    owner: owner.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
