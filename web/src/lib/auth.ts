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

async function sendPasswordResetEmail({
  to,
  url,
  userName,
}: {
  to: string;
  url: string;
  userName?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Password reset email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const greeting = userName ? `Merhaba ${userName},` : "Merhaba,";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "PrimeEstate şifre yenileme",
      text: `${greeting}

PrimeEstate hesabınız için şifre yenileme talebi aldık.

Şifrenizi yenilemek için aşağıdaki bağlantıyı kullanın:
${url}

Bu talebi siz oluşturmadıysanız bu e-postayı dikkate almayabilirsiniz.

PrimeEstate`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <p>${greeting}</p>
        <p>PrimeEstate hesabınız için şifre yenileme talebi aldık.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none">Şifremi Yenile</a></p>
        <p style="font-size:13px;color:#64748b">Bu talebi siz oluşturmadıysanız bu e-postayı dikkate almayabilirsiniz.</p>
        <p>PrimeEstate</p>
      </div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Password reset email provider returned ${response.status}: ${detail || "unknown error"}`,
    );
  }
}

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
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        userName: user.name,
      });
    },
  },
  user: {
    modelName: "user",
    fields: {
      email: "email",
      name: "name",
      image: "image",
    },
    additionalFields: {
      organizationId: {
        type: "string",
        required: true,
        input: false,
        returned: false,
      },
      officeId: {
        type: "string",
        required: true,
        input: false,
        returned: false,
      },
      teamId: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      role: {
        type: "string",
        required: true,
        input: false,
        returned: true,
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
        returned: false,
      },
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
