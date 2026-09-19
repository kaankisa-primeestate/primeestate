import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const buildPhase = process.env.NEXT_PHASE === "phase-production-build";
const configuredSecret = process.env.BETTER_AUTH_SECRET;

if (!configuredSecret && !buildPhase) {
  throw new Error("BETTER_AUTH_SECRET is not configured.");
}

const secret =
  configuredSecret ??
  "primeestate-build-placeholder-do-not-use-at-runtime";

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    modelName: "user",
    fields: {
      email: "email",
      name: "name",
      image: "image",
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "account",
  },
  verification: {
    modelName: "verification",
  },
  telemetry: {
    enabled: false,
  },
});
