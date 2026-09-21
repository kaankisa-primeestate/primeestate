import type { Prisma } from "@/generated/prisma/client";

import type { UserContext } from "@/lib/auth-context";

export type Capability =
  | "customers:read"
  | "customers:write"
  | "listings:read"
  | "listings:write"
  | "sales:read"
  | "sales:write"
  | "finance:read"
  | "finance:write"
  | "operations:read"
  | "operations:write"
  | "users:read"
  | "users:write";

const MANAGER_ROLES = new Set<UserContext["role"]>([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
]);

const ALL_CAPABILITIES: Capability[] = [
  "customers:read",
  "customers:write",
  "listings:read",
  "listings:write",
  "sales:read",
  "sales:write",
  "finance:read",
  "finance:write",
  "operations:read",
  "operations:write",
  "users:read",
  "users:write",
];

const ROLE_CAPABILITIES: Record<UserContext["role"], readonly Capability[]> = {
  SUPER_ADMIN: ALL_CAPABILITIES,
  ORG_ADMIN: ALL_CAPABILITIES,
  OFFICE_ADMIN: ALL_CAPABILITIES,
  TEAM_LEADER: [
    "customers:read",
    "customers:write",
    "listings:read",
    "listings:write",
    "sales:read",
    "sales:write",
    "finance:read",
    "finance:write",
    "operations:read",
    "operations:write",
    "users:read",
  ],
  AGENT: [
    "customers:read",
    "customers:write",
    "listings:read",
    "listings:write",
    "sales:read",
    "sales:write",
    "finance:read",
    "finance:write",
    "operations:read",
    "operations:write",
  ],
  VIEWER: [
    "customers:read",
    "listings:read",
    "sales:read",
    "finance:read",
    "operations:read",
    "users:read",
  ],
  AUDITOR: [
    "customers:read",
    "listings:read",
    "sales:read",
    "finance:read",
    "operations:read",
    "users:read",
  ],
};

export function hasCapability(context: UserContext, capability: Capability) {
  return ROLE_CAPABILITIES[context.role].includes(capability);
}

export function isManagerRole(role: UserContext["role"]) {
  return MANAGER_ROLES.has(role);
}

export function organizationScope(context: UserContext): Prisma.OrganizationWhereInput {
  return { id: context.organizationId };
}

export function officeScope(context: UserContext): Prisma.OfficeWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  return { organizationId: context.organizationId, id: context.officeId };
}

export function customerReadScope(context: UserContext): Prisma.CustomerWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  if (context.role === "OFFICE_ADMIN" || context.role === "VIEWER" || context.role === "AUDITOR") {
    return { organizationId: context.organizationId, officeId: context.officeId };
  }
  if (context.role === "TEAM_LEADER" && context.teamId) {
    return {
      organizationId: context.organizationId,
      officeId: context.officeId,
      owner: { teamId: context.teamId },
    };
  }
  return {
    organizationId: context.organizationId,
    officeId: context.officeId,
    ownerUserId: context.userId,
  };
}

export function customerWriteScope(context: UserContext): Prisma.CustomerWhereInput {
  return customerReadScope(context);
}

export function listingReadScope(context: UserContext): Prisma.ListingWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  return { organizationId: context.organizationId, officeId: context.officeId };
}

export function listingWriteScope(context: UserContext): Prisma.ListingWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  if (context.role === "OFFICE_ADMIN") {
    return { organizationId: context.organizationId, officeId: context.officeId };
  }
  if (context.role === "TEAM_LEADER" && context.teamId) {
    return {
      organizationId: context.organizationId,
      officeId: context.officeId,
      consultant: { teamId: context.teamId },
    };
  }
  return {
    organizationId: context.organizationId,
    officeId: context.officeId,
    consultantUserId: context.userId,
  };
}

export function saleScope(context: UserContext): Prisma.SaleWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { customer: { organizationId: context.organizationId } };
  }
  return { customer: customerReadScope(context) };
}

export function userReadScope(context: UserContext): Prisma.UserWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  if (context.role === "OFFICE_ADMIN" || context.role === "VIEWER" || context.role === "AUDITOR") {
    return { organizationId: context.organizationId, officeId: context.officeId };
  }
  if (context.role === "TEAM_LEADER" && context.teamId) {
    return {
      organizationId: context.organizationId,
      officeId: context.officeId,
      teamId: context.teamId,
    };
  }
  return { id: context.userId, organizationId: context.organizationId, officeId: context.officeId };
}

export function userWriteScope(context: UserContext): Prisma.UserWhereInput {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }
  return { organizationId: context.organizationId, officeId: context.officeId };
}
