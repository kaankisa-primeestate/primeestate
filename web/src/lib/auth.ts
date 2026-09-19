import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "prime-office";
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: { modelName: "AuthUser" },
  session: { modelName: "AuthSession" },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const baseSlug = slugify(user.name);
          let slug = baseSlug;
          let suffix = 1;
          while (await prisma.organization.findUnique({ where: { slug } })) slug = `${baseSlug}-${suffix++}`;
          await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({ data: { name: `${user.name} Office`, slug } });
            const office = await tx.office.create({ data: { organizationId: organization.id, name: `${user.name} Office`, slug: "main" } });
            await tx.user.create({ data: { authUserId: user.id, organizationId: organization.id, officeId: office.id, email: user.email, name: user.name, role: "ORG_ADMIN" } });
          });
        },
      },
    },
  },
});
