import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserContext = {
  userId: string;
  organizationId: string;
  officeId: string;
  teamId: string | null;
  role: "SUPER_ADMIN" | "ORG_ADMIN" | "OFFICE_ADMIN" | "TEAM_LEADER" | "AGENT" | "VIEWER" | "AUDITOR";
};

export async function getUserContext(): Promise<UserContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      organizationId: true,
      officeId: true,
      teamId: true,
      role: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    officeId: user.officeId,
    teamId: user.teamId,
    role: user.role,
  };
}
