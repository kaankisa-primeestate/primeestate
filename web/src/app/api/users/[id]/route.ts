import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/auth-context";
import { can, isManagerRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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
  if (isManagerRole(context.role)) {
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

  if (!can(context.role, "users", "update")) return forbidden();

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

  if (action === "UPDATE_CONSULTANT") {
    if (existing.role !== "AGENT") {
      return NextResponse.json(
        { message: "Bu kullanıcı aktif bir danışman hesabı değil." },
        { status: 400 },
      );
    }

    const profile = body?.profile && typeof body.profile === "object" ? body.profile : {};
    const company = body?.company && typeof body.company === "object" ? body.company : {};
    const commission = body?.commission && typeof body.commission === "object" ? body.commission : {};

    const firstName = typeof profile.firstName === "string" ? profile.firstName.trim() : "";
    const lastName = typeof profile.lastName === "string" ? profile.lastName.trim() : "";
    const phone = typeof profile.phone === "string" ? profile.phone.trim() : "";
    const companyName = typeof company.name === "string" ? company.name.trim() : "";
    const companyTitle = typeof company.title === "string" ? company.title.trim() : "";
    const companyTaxNumber = typeof company.taxNumber === "string" ? company.taxNumber.trim() : "";
    const companyPhone = typeof company.phone === "string" ? company.phone.trim() : "";
    const companyEmail = typeof company.email === "string" ? company.email.trim().toLowerCase() : "";
    const commissionModel = typeof commission.model === "string" ? commission.model.trim() : "";
    const officeShareRate = commission.officeShareRate === "" || commission.officeShareRate == null
      ? null
      : Number(commission.officeShareRate);
    const consultantShareRate = commission.consultantShareRate === "" || commission.consultantShareRate == null
      ? null
      : Number(commission.consultantShareRate);

    if (!firstName || !lastName || !phone || !companyName || !commissionModel) {
      return NextResponse.json(
        { message: "Danışman adı, soyadı, telefon, şirket ve komisyon modeli zorunludur." },
        { status: 400 },
      );
    }

    if (
      (officeShareRate !== null && (!Number.isFinite(officeShareRate) || officeShareRate < 0 || officeShareRate > 100)) ||
      (consultantShareRate !== null && (!Number.isFinite(consultantShareRate) || consultantShareRate < 0 || consultantShareRate > 100))
    ) {
      return NextResponse.json(
        { message: "Komisyon oranları 0-100 arasında olmalıdır." },
        { status: 400 },
      );
    }

    if (companyEmail && !/^\S+@\S+\.\S+$/.test(companyEmail)) {
      return NextResponse.json(
        { message: "Şirket e-posta adresi geçerli değil." },
        { status: 400 },
      );
    }

    const existingProfile = await prisma.consultantProfile.findUnique({
      where: { userId: existing.id },
      select: { id: true },
    });
    const existingCompany = await prisma.consultantCompany.findUnique({
      where: { userId: existing.id },
      select: { id: true },
    });
    const existingCommission = await prisma.consultantCommissionPlan.findUnique({
      where: { userId: existing.id },
      select: { id: true },
    });

    if (!existingProfile || !existingCompany || !existingCommission) {
      return NextResponse.json(
        { message: "Bu danışman hesabının resmi profil kayıtları eksik. Önce onboarding kaydını tamamlayın." },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextProfile = await tx.consultantProfile.update({
        where: { userId: existing.id },
        data: { firstName, lastName, phone },
      });

      const nextCompany = await tx.consultantCompany.update({
        ? await tx.consultantCompany.update({
            where: { userId: existing.id },
            data: {
              name: companyName,
              title: companyTitle || null,
              taxNumber: companyTaxNumber || null,
              phone: companyPhone || null,
              email: companyEmail || null,
            },
          })
        : await tx.consultantCompany.create({
            data: {
              userId: existing.id,
              organizationId: context.organizationId,
              officeId: existing.officeId,
              name: companyName,
              title: companyTitle || null,
              taxNumber: companyTaxNumber || null,
              phone: companyPhone || null,
              email: companyEmail || null,
            },
          });

      const nextCommission = existingCommission
        ? await tx.consultantCommissionPlan.update({
            where: { userId: existing.id },
            data: {
              model: commissionModel,
              officeShareRate,
              consultantShareRate,
              active: true,
              effectiveTo: null,
            },
          })
      
      await tx.user.update({
        where: { id: existing.id },
        data: { name: `${firstName} ${lastName}` },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "CONSULTANT_PROFILE_UPDATED",
          entityType: "User",
          entityId: existing.id,
          metadata: {
            officeId: existing.officeId,
            commissionModel,
            officeShareRate,
            consultantShareRate,
          },
        },
      });

      return { nextProfile, nextCompany, nextCommission };
    });

    return NextResponse.json({
      consultantProfile: updated.nextProfile,
      consultantCompany: updated.nextCompany,
      consultantCommissionPlan: {
        ...updated.nextCommission,
        officeShareRate: updated.nextCommission.officeShareRate?.toString() ?? null,
        consultantShareRate: updated.nextCommission.consultantShareRate?.toString() ?? null,
      },
      message: "Danışman bilgileri güncellendi.",
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
