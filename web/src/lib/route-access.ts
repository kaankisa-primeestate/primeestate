import type { UserRole } from "@/lib/authz";

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/forbidden",
  "/health",
  "/office-application",
  "/consultant-application",
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

export function requiredRoleForPage(pathname: string): "manager" | "super_admin" | null {
  if (
    pathname === "/platform" ||
    pathname.startsWith("/platform/")
  ) {
    return "super_admin";
  }

  if (
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/consultant-applications" ||
    pathname.startsWith("/consultant-applications/")
  ) {
    return "manager";
  }

  return null;
}

const SUPER_ADMIN_ROLES = new Set<UserRole>(["SUPER_ADMIN"]);

export function canAccessPageRole(
  role: UserRole | null | undefined,
  requirement: "manager" | "super_admin" | null,
): boolean {
  if (!requirement) return true;
  if (!role) return false;

  if (requirement === "super_admin") {
    return SUPER_ADMIN_ROLES.has(role);
  }

  return MANAGER_ROLES.has(role);
}

export function canAccessPageRole(
  role: UserRole | null | undefined,
  requirement: "manager" | null,
): boolean {
  if (!requirement) return true;
  if (!role) return false;
  return requirement === "manager" && MANAGER_ROLES.has(role);
}
