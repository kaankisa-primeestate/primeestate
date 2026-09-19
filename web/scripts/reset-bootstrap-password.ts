import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("Bootstrap admin credentials are not configured.");
}

const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, active: true, role: true },
});

if (!user) {
  throw new Error("Bootstrap admin user does not exist.");
}

const context = await auth.$context;
const hashedPassword = await context.password.hash(password);

const account = await prisma.account.findFirst({
  where: {
    userId: user.id,
    providerId: "credential",
  },
  select: { id: true },
});

if (!account) {
  await context.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: hashedPassword,
  });
} else {
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashedPassword },
  });
}

const stored = await prisma.account.findFirst({
  where: { userId: user.id, providerId: "credential" },
  select: { password: true },
});

const verified = Boolean(
  stored?.password &&
    (await context.password.verify({
      password,
      hash: stored.password,
    })),
);

console.log(JSON.stringify({
  status: verified ? "password_verified" : "password_verification_failed",
  userId: user.id,
  active: user.active,
  role: user.role,
}));

if (!verified) {
  throw new Error("The stored credential could not be verified with the configured bootstrap password.");
}

await prisma.$disconnect();
