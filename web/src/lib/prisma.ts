import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder:placeholder@localhost:5432/primeestate?schema=public";

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ?? BUILD_PLACEHOLDER_DATABASE_URL;

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
