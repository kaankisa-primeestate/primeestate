export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
  "TEAM_LEADER",
  "AGENT",
  "VIEWER",
  "AUDITOR",
] as const;

export type UserRole = (typeof ROLE_VALUES)[number];

export type AuthorizationContext = {
  userId: string;
  organizationId: string;
  officeId: string;
  teamId: string | null;
  role: UserRole;
};

export type AuthorizationAction = "read" | "create" | "update" | "delete" | "manage";

export type AuthorizationResource =
  | "customers"
  | "demands"
  | "listings"
  | "showings"
  | "offers"
  | "sales"
  | "payments"
  | "paymentPlans"
  | "installments"
  | "tasks"
  | "activities"
  | "matching"
  | "users";

const MANAGER_ROLES = new Set<UserRole>(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
const WRITE_ROLES = new Set<UserRole>([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
  "TEAM_LEADER",
  "AGENT",
]);

const ROLE_CAPABILITIES: Record<UserRole, ReadonlySet<AuthorizationAction>> = {
  SUPER_ADMIN: new Set(["read", "create", "update", "delete", "manage"]),
  ORG_ADMIN: new Set(["read", "create", "update", "delete", "manage"]),
  OFFICE_ADMIN: new Set(["read", "create", "update", "delete", "manage"]),
  TEAM_LEADER: new Set(["read", "create", "update"]),
  AGENT: new Set(["read", "create", "update"]),
  VIEWER: new Set(["read"]),
  AUDITOR: new Set(["read"]),
};

export class AuthorizationDeniedError extends Error {
  constructor(message = "Authorization denied.") {
    super(message);
    this.name = "AuthorizationDeniedError";
  }
}

export function isManagerRole(role: UserRole): boolean {
  return MANAGER_ROLES.has(role);
}

export function isReadOnlyRole(role: UserRole): boolean {
  return !WRITE_ROLES.has(role);
}

export function can(
  role: UserRole,
  _resource: AuthorizationResource,
  action: AuthorizationAction,
): boolean {
  return ROLE_CAPABILITIES[role].has(action);
}

export function canManageUsers(role: UserRole): boolean {
  return isManagerRole(role);
}

export function assertCan(
  context: AuthorizationContext,
  resource: AuthorizationResource,
  action: AuthorizationAction,
): void {
  if (!can(context.role, resource, action)) {
    throw new AuthorizationDeniedError();
  }
}

export function customerOwnershipScope(context: AuthorizationContext) {
  if (isManagerRole(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) {
    return { owner: { teamId: context.teamId } };
  }
  return { ownerUserId: context.userId };
}

export function canAssignCustomerOwner(
  context: AuthorizationContext,
  ownerTeamId: string | null,
): boolean {
  if (isManagerRole(context.role)) return true;
  if (context.role === "TEAM_LEADER") {
    return Boolean(context.teamId && ownerTeamId === context.teamId);
  }
  return false;
}

export function officeListingScope(context: AuthorizationContext) {
  return {
    organizationId: context.organizationId,
    officeId: context.officeId,
  };
}
