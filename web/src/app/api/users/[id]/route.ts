import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, isManagerRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
const ROLE_VALUES = [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
  "TEAM_LEADER",
  "AGENT",
  "VIEWER",
  "AUDITOR",
] as const;

type ManagedRole = (typeof ROLE_VALUES)[number];

function canManageRole(actorRole: ManagedRole, targetRole: ManagedRole) {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole === "ORG_ADMIN") return targetRole !== "SUPER_ADMIN";
  if (actorRole === "OFFICE_ADMIN") {
    return ["OFFICE_ADMIN", "TEAM_LEADER", "AGENT", "VIEWER", "AUDITOR"].includes(
      targetRole,
    );
  }
  return false;
}

function targetScope(
  context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>,
) {
  if (context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN") {
    return { organizationId: context.organizationId };
  }

  return {
    organizationId: context.organizationId,
    officeId: context.officeId,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();

  if (!context) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  assertCan(context, "users", "create");

  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, ...targetScope(context) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      officeId: true,
      teamId: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Kullanıcı bulunamadı veya yetkiniz yok." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "RESET_PASSWORD") {
    try {
      await auth.api.requestPasswordReset({
        body: {
          email: existing.email,
          redirectTo: new URL("/reset-password", request.url).toString(),
        },
      });
    } catch (error) {
      console.error("PrimeEstate password reset email failed.", error);
      return NextResponse.json(
        { message: "Şifre yenileme e-postası gönderilemedi. E-posta ayarlarını kontrol edin." },
        { status: 502 },
      );
    }

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "USER_PASSWORD_RESET_REQUESTED",
        entityType: "User",
        entityId: existing.id,
        metadata: { email: existing.email },
      },
    });

    return NextResponse.json({
      message: "Şifre belirleme bağlantısı kullanıcıya gönderildi.",
    });
  }

  if (action === "TOGGLE_ACTIVE") {
    if (existing.id === context.userId) {
      return NextResponse.json(
        { message: "Kendi hesabınızı bu ekrandan pasifleştiremezsiniz." },
        { status: 400 },
      );
    }

    const nextActive = !existing.active;

    await prisma.user.update({
      where: { id: existing.id },
      data: { active: nextActive },
    });

    if (!nextActive) {
      await prisma.session.deleteMany({
        where: { userId: existing.id },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: nextActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "User",
        entityId: existing.id,
        metadata: { email: existing.email },
      },
    });

    return NextResponse.json({
      user: { ...existing, active: nextActive },
      message: nextActive ? "Kullanıcı aktifleştirildi." : "Kullanıcı pasifleştirildi.",
    });
  }

  if (action !== "UPDATE") {
    return NextResponse.json(
      { message: "Geçersiz kullanıcı işlemi." },
      { status: 400 },
    );
  }

  const requestedRole =
    typeof body?.role === "string" ? body.role : existing.role;
  const requestedOfficeId =
    typeof body?.officeId === "string" ? body.officeId : existing.officeId;
  const requestedTeamId =
    typeof body?.teamId === "string" && body.teamId ? body.teamId : null;
  const requestedName =
    typeof body?.name === "string" ? body.name.trim() : existing.name;

  if (!ROLE_VALUES.includes(requestedRole as ManagedRole)) {
    return NextResponse.json(
      { message: "Geçersiz kullanıcı rolü." },
      { status: 400 },
    );
  }

  if (!requestedName) {
    return NextResponse.json(
      { message: "Ad soyad boş bırakılamaz." },
      { status: 400 },
    );
  }

  const role = requestedRole as ManagedRole;

  if (!canManageRole(context.role, role)) {
    return NextResponse.json(
      { message: "Bu rolü atama yetkiniz yok." },
      { status: 403 },
    );
  }

  const office = await prisma.office.findFirst({
    where: {
      id: requestedOfficeId,
      organizationId: context.organizationId,
      ...(context.role === "OFFICE_ADMIN" ? { id: context.officeId } : {}),
    },
    select: { id: true },
  });

  if (!office) {
    return NextResponse.json(
      { message: "Seçilen ofis bulunamadı veya yetkiniz yok." },
      { status: 403 },
    );
  }

  if (requestedTeamId) {
    const team = await prisma.team.findFirst({
      where: { id: requestedTeamId, officeId: office.id },
      select: { id: true },
    });

    if (!team) {
      return NextResponse.json(
        { message: "Seçilen ekip bu ofise ait değil." },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: requestedName,
      role,
      officeId: office.id,
      teamId: requestedTeamId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      officeId: true,
      teamId: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: updated.id,
      metadata: {
        role: updated.role,
        officeId: updated.officeId,
        teamId: updated.teamId,
      },
    },
  });

  return NextResponse.json({ user: updated, message: "Kullanıcı güncellendi." });
}
