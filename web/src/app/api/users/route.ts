import { randomBytes } from "node:crypto";
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

function canManageRole(
  actorRole: ManagedRole,
  targetRole: ManagedRole,
) {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole === "ORG_ADMIN") {
    return targetRole !== "SUPER_ADMIN";
  }
  if (actorRole === "OFFICE_ADMIN") {
    return ["OFFICE_ADMIN", "TEAM_LEADER", "AGENT", "VIEWER", "AUDITOR"].includes(
      targetRole,
    );
  }
  return false;
}

function userScope(
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

export async function GET() {
  const context = await getUserContext();

  if (!context) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  if (!can(context.role, "users", "read")) return forbidden();

  const users = await prisma.user.findMany({
    where: userScope(context),
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      officeId: true,
      teamId: true,
      createdAt: true,
      office: {
        select: { id: true, name: true, slug: true },
      },
      team: {
        select: { id: true, name: true },
      },
      consultantProfile: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          tcIdentityLast4: true,
        },
      },
      consultantCompany: {
        select: {
          name: true,
          title: true,
          taxNumber: true,
          phone: true,
          email: true,
        },
      },
      consultantCommissionPlan: {
        select: {
          model: true,
          officeShareRate: true,
          consultantShareRate: true,
          active: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
    },
  });

  const [customerCounts, listingRows, salesRows] = await Promise.all([
    prisma.customer.groupBy({
      by: ["ownerUserId"],
      where: userScope(context).officeId
        ? { organizationId: context.organizationId, officeId: context.officeId }
        : { organizationId: context.organizationId },
      _count: { _all: true },
    }),
    prisma.listing.findMany({
      where: officeListingScope(context),
      select: {
        consultantUserId: true,
        status: true,
      },
    }),
    prisma.sale.findMany({
      where: {
        listing: officeListingScope(context),
      },
      select: {
        amount: true,
        status: true,
        listing: { select: { consultantUserId: true } },
      },
    }),
  ]);

  const customerCountByUser = new Map(customerCounts.map((item) => [item.ownerUserId, item._count._all]));
  const listingCountByUser = new Map<string, number>();
  const activeListingCountByUser = new Map<string, number>();

  for (const listing of listingRows) {
    if (!listing.consultantUserId) continue;
    listingCountByUser.set(
      listing.consultantUserId,
      (listingCountByUser.get(listing.consultantUserId) ?? 0) + 1,
    );
    if (listing.status === "AKTIF") {
      activeListingCountByUser.set(
        listing.consultantUserId,
        (activeListingCountByUser.get(listing.consultantUserId) ?? 0) + 1,
      );
    }
  }

  const salesByUser = new Map<string, { count: number; closedCount: number; volume: number }>();
  for (const sale of salesRows) {
    const consultantUserId = sale.listing.consultantUserId;
    if (!consultantUserId) continue;

    const current = salesByUser.get(consultantUserId) ?? { count: 0, closedCount: 0, volume: 0 };
    current.count += 1;
    if (sale.status === "TAMAMLANDI") {
      current.closedCount += 1;
      current.volume += Number(sale.amount);
    }
    salesByUser.set(consultantUserId, current);
  }

  const consultantApplications = await prisma.consultantApplication.findMany({
    where:
      context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN"
        ? { organizationId: context.organizationId }
        : { organizationId: context.organizationId, officeId: context.officeId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      email: true,
      status: true,
      createdAt: true,
    },
  });

  const latestApplicationByEmail = new Map<string, {
    status: string;
    createdAt: Date;
  }>();

  for (const application of consultantApplications) {
    if (!latestApplicationByEmail.has(application.email)) {
      latestApplicationByEmail.set(application.email, {
        status: application.status,
        createdAt: application.createdAt,
      });
    }
  }

  const offices =
    context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN"
      ? await prisma.office.findMany({
          where: { organizationId: context.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : await prisma.office.findMany({
          where: {
            organizationId: context.organizationId,
            id: context.officeId,
          },
          select: { id: true, name: true, slug: true },
        });

  const currentOffice = await prisma.office.findUnique({
    where: { id: context.officeId },
    select: { slug: true },
  });

  const teams = await prisma.team.findMany({
    where: {
      office: {
        organizationId: context.organizationId,
        ...(context.role === "OFFICE_ADMIN"
          ? { id: context.officeId }
          : {}),
      },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, officeId: true },
  });

  return NextResponse.json({
    users: users.map((user) => {
      const application = latestApplicationByEmail.get(user.email);

      const sales = salesByUser.get(user.id) ?? { count: 0, closedCount: 0, volume: 0 };

      return {
        ...user,
        performance: {
          customerCount: customerCountByUser.get(user.id) ?? 0,
          listingCount: listingCountByUser.get(user.id) ?? 0,
          activeListingCount: activeListingCountByUser.get(user.id) ?? 0,
          saleCount: sales.count,
          closedSaleCount: sales.closedCount,
          closedSalesVolume: sales.volume,
        },
        consultantProfile: user.consultantProfile
          ? {
              ...user.consultantProfile,
            }
          : null,
        consultantCompany: user.consultantCompany
          ? {
              ...user.consultantCompany,
            }
          : null,
        consultantCommissionPlan: user.consultantCommissionPlan
          ? {
              ...user.consultantCommissionPlan,
              officeShareRate: user.consultantCommissionPlan.officeShareRate?.toString() ?? null,
              consultantShareRate:
                user.consultantCommissionPlan.consultantShareRate?.toString() ?? null,
              effectiveFrom: user.consultantCommissionPlan.effectiveFrom.toISOString(),
              effectiveTo: user.consultantCommissionPlan.effectiveTo?.toISOString() ?? null,
            }
          : null,
        consultantApplication: application
          ? {
              status: application.status,
              createdAt: application.createdAt.toISOString(),
            }
          : null,
      };
    }),
    offices,
    teams,
    currentUser: {
      id: context.userId,
      role: context.role,
      officeId: context.officeId,
      officeSlug: currentOffice?.slug ?? null,
    },
  });
}

export async function POST(request: Request) {
  const context = await getUserContext();

  if (!context) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  if (!can(context.role, "users", "create")) return forbidden();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const requestedRole =
    typeof body?.role === "string" ? body.role : "AGENT";
  const requestedOfficeId =
    typeof body?.officeId === "string" ? body.officeId : "";
  const requestedTeamId =
    typeof body?.teamId === "string" && body.teamId ? body.teamId : null;

  if (!name || !email) {
    return NextResponse.json(
      { message: "Ad soyad ve e-posta zorunludur." },
      { status: 400 },
    );
  }

  if (!ROLE_VALUES.includes(requestedRole as ManagedRole)) {
    return NextResponse.json(
      { message: "Geçersiz kullanıcı rolü." },
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

  const officeId =
    context.role === "OFFICE_ADMIN"
      ? context.officeId
      : requestedOfficeId || context.officeId;

  const office = await prisma.office.findFirst({
    where: {
      id: officeId,
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
      where: {
        id: requestedTeamId,
        officeId: office.id,
      },
      select: { id: true },
    });

    if (!team) {
      return NextResponse.json(
        { message: "Seçilen ekip bu ofise ait değil." },
        { status: 400 },
      );
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Bu e-posta adresi zaten bir kullanıcıya ait." },
      { status: 409 },
    );
  }

  const contextAuth = await auth.$context;
  const temporaryPassword = randomBytes(32).toString("base64url");

  const user = await contextAuth.internalAdapter.createUser(
    {
      email,
      name,
      emailVerified: false,
      organizationId: context.organizationId,
      officeId: office.id,
      teamId: requestedTeamId,
      role,
      active: true,
    },
    { method: "admin-create" },
  );

  await contextAuth.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await contextAuth.password.hash(temporaryPassword),
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: {
        email,
        role,
        officeId: office.id,
        teamId: requestedTeamId,
      },
    },
  });

  let resetEmailSent = false;

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: new URL("/reset-password", request.url).toString(),
      },
    });
    resetEmailSent = true;
  } catch (error) {
    console.error("PrimeEstate initial password reset email failed.", error);
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: true,
        officeId: office.id,
        teamId: requestedTeamId,
      },
      resetEmailSent,
      message: resetEmailSent
        ? "Kullanıcı oluşturuldu ve şifre belirleme işlemi başlatıldı."
        : "Kullanıcı oluşturuldu ancak şifre belirleme e-postası başlatılamadı. E-posta ayarlarını kontrol edin ve kullanıcı kartından tekrar deneyin.",
    },
    { status: 201 },
  );
}
