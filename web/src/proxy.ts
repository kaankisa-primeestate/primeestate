import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/authz";
import { canAccessPageRole, isPublicPagePath, requiredRoleForPage } from "@/lib/route-access";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPagePath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requirement = requiredRoleForPage(pathname);
  const role =
    typeof session.user.role === "string"
      ? (session.user.role as UserRole)
      : null;

  if (!canAccessPageRole(role, requirement)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const runtime = "nodejs";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
