import { hashPassword } from "better-auth/crypto";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const required = [
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_ADMIN_NAME",
  "BOOTSTRAP_ADMIN_PASSWORD",
  "BOOTSTRAP_ORGANIZATION_NAME",
  "BOOTSTRAP_ORGANIZATION_SLUG",
  "BOOTSTRAP_OFFICE_NAME",
  "BOOTSTRAP_OFFICE_SLUG",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required bootstrap environment variable: ${key}`);
  }
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL!.trim().toLowerCase();
const name = process.env.BOOTSTRAP_ADMIN_NAME!.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD!;
const organizationName = process.env.BOOTSTRAP_ORGANIZATION_NAME!.trim();
const organizationSlug = process.env.BOOTSTRAP_ORGANIZATION_SLUG!.trim().toLowerCase();
const officeName = process.env.BOOTSTRAP_OFFICE_NAME!.trim();
const officeSlug = process.env.BOOTSTRAP_OFFICE_SLUG!.trim().toLowerCase();

if (password.length < 8) {
  throw new Error("Bootstrap password must be at least 8 characters.");
}

const existing = await prisma.user.findUnique({
  where: { email },
  select: { id: true, organizationId: true, officeId: true, role: true },
});

if (existing) {
  console.log(JSON.stringify({
    status: "already_exists",
    userId: existing.id,
    organizationId: existing.organizationId,
    officeId: existing.officeId,
    role: existing.role,
  }));
  await prisma.$disconnect();
  process.exit(0);
}

const organization = await prisma.organization.upsert({
  where: { slug: organizationSlug },
  update: { name: organizationName },
  create: {
    name: organizationName,
    slug: organizationSlug,
  },
});

const office = await prisma.office.upsert({
  where: {
    organizationId_slug: {
      organizationId: organization.id,
      slug: officeSlug,
    },
  },
  update: { name: officeName },
  create: {
    organizationId: organization.id,
    name: officeName,
    slug: officeSlug,
  },
});

const context = await auth.$context;
const user = await context.internalAdapter.createUser({
  email,
  name,
  emailVerified: true,
  organizationId: organization.id,
  officeId: office.id,
  teamId: null,
  role: "ORG_ADMIN",
  active: true,
});

await context.internalAdapter.linkAccount({
  accountId: user.id,
  providerId: "credential",
  userId: user.id,
  password: await hashPassword(password),
});

await prisma.auditLog.create({
  data: {
    organizationId: organization.id,
    actorUserId: user.id,
    action: "BOOTSTRAP_ADMIN_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: {
      organizationId: organization.id,
      officeId: office.id,
    },
  },
});

console.log(JSON.stringify({
  status: "created",
  userId: user.id,
  organizationId: organization.id,
  officeId: office.id,
  role: "ORG_ADMIN",
}));

await prisma.$disconnect();
