import type { UserRole } from "@/lib/authz";

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/forbidden",
  "/health",
];

const MANAGER_ROLES = new Set<UserRole>([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
]);

export function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function requiredRoleForPage(pathname: string): "manager" | null {
  if (pathname === "/users" || pathname.startsWith("/users/")) {
    return "manager";
  }
  return null;
}

export function canAccessPageRole(
  role: UserRole | null | undefined,
  requirement: "manager" | null,
): boolean {
  if (!requirement) return true;
  if (!role) return false;
  return requirement === "manager" && MANAGER_ROLES.has(role);
}
