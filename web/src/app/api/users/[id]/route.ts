import { NextResponse } from "next/server";
import { apiError, authenticationRequired, conflict, forbidden, validationError, notFound } from "@/lib/api-response";

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
    return authenticationRequired();
  }

  if (!isManagerRole(context.role)) return forbidden("Kullanıcı yönetimi yetkiniz yok.");
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
    return notFound("Kullanıcı bulunamadı veya yetkiniz yok.");
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
      return apiError(502, "INTERNAL_ERROR", "Şifre yenileme e-postası gönderilemedi. E-posta ayarlarını kontrol edin.");
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
      return validationError("Kendi hesabınızı bu ekrandan pasifleştiremezsiniz.");
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
      return validationError("Bu kullanıcı aktif bir danışman hesabı değil.");
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
    const officeShareRate =
      commission.officeShareRate === "" || commission.officeShareRate == null
        ? null
        : Number(commission.officeShareRate);
    const consultantShareRate =
      commission.consultantShareRate === "" || commission.consultantShareRate == null
        ? null
        : Number(commission.consultantShareRate);
    const rentAmount = commission.rentAmount === "" || commission.rentAmount == null ? null : Number(commission.rentAmount);
    const rentCurrency = typeof commission.rentCurrency === "string" && commission.rentCurrency.trim() ? commission.rentCurrency.trim().toUpperCase() : "TRY";
    const rentStartDate = commission.rentStartDate ? new Date(String(commission.rentStartDate)) : null;
    const rentDueDay = commission.rentDueDay === "" || commission.rentDueDay == null ? null : Number(commission.rentDueDay);
    const termsNote = typeof commission.termsNote === "string" ? commission.termsNote.trim() : "";

    if (!firstName || !lastName || !phone || !companyName || !commissionModel) {
      return validationError("Danışman adı, soyadı, telefon, şirket ve komisyon modeli zorunludur.");
    }

    if (
      (officeShareRate !== null &&
        (!Number.isFinite(officeShareRate) || officeShareRate < 0 || officeShareRate > 100)) ||
      (consultantShareRate !== null &&
        (!Number.isFinite(consultantShareRate) || consultantShareRate < 0 || consultantShareRate > 100)) ||
      (rentAmount !== null && (!Number.isFinite(rentAmount) || rentAmount < 0)) ||
      (rentDueDay !== null && (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 31)) ||
      (rentStartDate !== null && Number.isNaN(rentStartDate.getTime()))
    ) {
      return validationError("Komisyon oranları 0-100 arasında olmalıdır.");
    }

    if (officeShareRate !== null && consultantShareRate !== null && Math.abs(officeShareRate + consultantShareRate - 100) > 0.01) {
      return validationError("Ofis ve danışman paylaşım oranlarının toplamı %100 olmalıdır.");
    }

    if (companyEmail && !/^\S+@\S+\.\S+$/.test(companyEmail)) {
      return validationError("Şirket e-posta adresi geçerli değil.");
    }

    const [existingProfile, existingCompany, existingCommission] = await Promise.all([
      prisma.consultantProfile.findUnique({
        where: { userId: existing.id },
        select: { id: true },
      }),
      prisma.consultantCompany.findUnique({
        where: { userId: existing.id },
        select: { id: true },
      }),
      prisma.consultantCommissionPlan.findUnique({
        where: { userId: existing.id },
        select: {
          id: true, model: true, officeShareRate: true, consultantShareRate: true,
          rentAmount: true, rentCurrency: true, rentStartDate: true, rentDueDay: true, termsNote: true,
        },
      }),
    ]);

    if (!existingProfile || !existingCompany || !existingCommission) {
      return conflict("Bu danışman hesabının resmi profil kayıtları eksik. Önce onboarding kaydını tamamlayın.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextProfile = await tx.consultantProfile.update({
        where: { userId: existing.id },
        data: { firstName, lastName, phone },
      });

      const nextCompany = await tx.consultantCompany.update({
        where: { userId: existing.id },
        data: {
          name: companyName,
          title: companyTitle || null,
          taxNumber: companyTaxNumber || null,
          phone: companyPhone || null,
          email: companyEmail || null,
        },
      });

      const nextCommission = await tx.consultantCommissionPlan.update({
        where: { userId: existing.id },
        data: {
          model: commissionModel,
          officeShareRate,
          consultantShareRate,
          rentAmount,
          rentCurrency,
          rentStartDate,
          rentDueDay,
          termsNote: termsNote || null,
          active: true,
          effectiveTo: null,
        },
      });

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
            rentAmount,
            rentCurrency,
            rentStartDate,
            rentDueDay,
            termsNote: termsNote || null,
            previous: {
              model: existingCommission?.model ?? null,
              officeShareRate: existingCommission?.officeShareRate?.toString() ?? null,
              consultantShareRate: existingCommission?.consultantShareRate?.toString() ?? null,
              rentAmount: existingCommission?.rentAmount?.toString() ?? null,
              rentCurrency: existingCommission?.rentCurrency ?? null,
              rentStartDate: existingCommission?.rentStartDate?.toISOString() ?? null,
              rentDueDay: existingCommission?.rentDueDay ?? null,
              termsNote: existingCommission?.termsNote ?? null,
            },
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
    return validationError("Geçersiz kullanıcı işlemi.");
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
    return validationError("Geçersiz kullanıcı rolü.");
  }

  if (!requestedName) {
    return validationError("Ad soyad boş bırakılamaz.");
  }

  const role = requestedRole as ManagedRole;

  if (!canManageRole(context.role, role)) {
    return forbidden("Bu rolü atama yetkiniz yok.");
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
    return forbidden("Seçilen ofis bulunamadı veya yetkiniz yok.");
  }

  if (requestedTeamId) {
    const team = await prisma.team.findFirst({
      where: { id: requestedTeamId, officeId: office.id },
      select: { id: true },
    });

    if (!team) {
      return validationError("Seçilen ekip bu ofise ait değil.");
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
