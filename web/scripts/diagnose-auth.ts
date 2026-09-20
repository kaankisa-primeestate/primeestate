import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const email = process.env.AUTH_DIAGNOSTIC_EMAIL?.trim().toLowerCase();
const password = process.env.AUTH_DIAGNOSTIC_PASSWORD;

if (!email) {
  throw new Error("AUTH_DIAGNOSTIC_EMAIL is required.");
}

async function main() {
  const result = {
    database: { connected: false },
    user: {
      found: false,
      active: null as boolean | null,
      role: null as string | null,
      organizationPresent: false,
      officePresent: false,
    },
    credential: {
      found: false,
      passwordHashPresent: false,
      passwordVerified: null as boolean | null,
    },
    sessions: {
      total: 0,
      active: 0,
    },
  };

  await prisma.$queryRaw`SELECT 1`;
  result.database.connected = true;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true, role: true, organizationId: true, officeId: true },
  });

  if (!user) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }

  result.user.found = true;
  result.user.active = user.active;
  result.user.role = user.role;
  result.user.organizationPresent = Boolean(user.organizationId);
  result.user.officePresent = Boolean(user.officeId);

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true, password: true },
  });

  if (credential) {
    result.credential.found = true;
    result.credential.passwordHashPresent = Boolean(credential.password);

    if (password && credential.password) {
      const context = await auth.$context;
      result.credential.passwordVerified = await context.password.verify({
        password,
        hash: credential.password,
      });
    }
  }

  result.sessions.total = await prisma.session.count({ where: { userId: user.id } });
  result.sessions.active = await prisma.session.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });

  console.log(JSON.stringify(result, null, 2));

  if (
    !result.user.active ||
    !result.credential.found ||
    !result.credential.passwordHashPresent ||
    result.credential.passwordVerified === false
  ) {
    process.exitCode = 3;
  }
}

main()
  .catch((error) => {
    console.error("AUTH_DIAGNOSTIC_FAILED");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
