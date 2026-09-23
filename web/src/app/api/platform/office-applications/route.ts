import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ofis";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const officeName = typeof body?.officeName === "string" ? body.officeName.trim() : "";
  const ownerFirstName = typeof body?.ownerFirstName === "string" ? body.ownerFirstName.trim() : "";
  const ownerLastName = typeof body?.ownerLastName === "string" ? body.ownerLastName.trim() : "";
  const ownerEmail = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const ownerPhone = typeof body?.ownerPhone === "string" ? body.ownerPhone.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!officeName || !ownerFirstName || !ownerLastName || !ownerEmail || !ownerPhone || !password) {
    return NextResponse.json({ message: "Ofis adı, ad, soyad, telefon, e-posta ve şifre zorunludur." }, { status: 400 });
  }

  if (!isValidEmail(ownerEmail)) {
    return NextResponse.json({ message: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ message: "Şifre 8-128 karakter arasında olmalıdır." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ message: "Bu e-posta adresi zaten kayıtlı." }, { status: 409 });
  }

  const existingApplication = await prisma.officeApplication.findFirst({
    where: { ownerEmail, status: "BEKLEMEDE" },
    select: { id: true },
  });
  if (existingApplication) {
    return NextResponse.json({ message: "Bu e-posta ile bekleyen bir ofis başvurusu zaten var." }, { status: 409 });
  }

  const contextAuth = await auth.$context;
  const passwordHash = await contextAuth.password.hash(password);

  const application = await prisma.officeApplication.create({
    data: {
      officeName,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerPhone,
      passwordHash,
    },
    select: {
      id: true,
      officeName: true,
      ownerFirstName: true,
      ownerLastName: true,
      ownerEmail: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      application,
      message: "Ofis başvurunuz alındı. PrimeEstate onayından sonra hesabınız aktif edilecektir.",
    },
    { status: 201 },
  );
}

export async function GET() {
  const context = await getUserContext();

  if (!context || context.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Platform yöneticisi yetkisi gerekli." }, { status: 403 });
  }

  const applications = await prisma.officeApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      officeName: true,
      ownerFirstName: true,
      ownerLastName: true,
      ownerEmail: true,
      ownerPhone: true,
      status: true,
      rejectionNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ applications });
}

export async function PATCH(request: Request) {
  const context = await getUserContext();

  if (!context || context.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Platform yöneticisi yetkisi gerekli." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action === "APPROVE" || body?.action === "REJECT" ? body.action : "";
  const rejectionNote = typeof body?.rejectionNote === "string" ? body.rejectionNote.trim() : "";

  if (!id || !action) {
    return NextResponse.json({ message: "Başvuru ve işlem bilgisi zorunludur." }, { status: 400 });
  }

  const application = await prisma.officeApplication.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ message: "Başvuru bulunamadı." }, { status: 404 });
  }

  if (application.status !== "BEKLEMEDE") {
    return NextResponse.json({ message: "Bu başvuru daha önce sonuçlandırılmış." }, { status: 409 });
  }

  if (action === "REJECT") {
    const updated = await prisma.officeApplication.update({
      where: { id },
      data: { status: "REDDEDILDI", rejectionNote: rejectionNote || null, reviewedAt: new Date() },
      select: { id: true, status: true, reviewedAt: true },
    });
    return NextResponse.json({ application: updated, message: "Ofis başvurusu reddedildi." });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: application.ownerEmail }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ message: "Bu e-posta zaten aktif bir kullanıcıya ait." }, { status: 409 });
  }

  const baseSlug = slugify(application.officeName);
  const organizationSlug = baseSlug + "-" + randomUUID().slice(0, 8);
  const officeSlug = baseSlug + "-" + randomUUID().slice(0, 8);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: application.officeName,
        slug: organizationSlug,
      },
    });

    const office = await tx.office.create({
      data: {
        organizationId: organization.id,
        name: application.officeName,
        slug: officeSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        officeId: office.id,
        email: application.ownerEmail,
        name: `${application.ownerFirstName} ${application.ownerLastName}`,
        role: "OFFICE_ADMIN",
        active: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: null,
        action: "OFFICE_APPLICATION_APPROVED",
        entityType: "OfficeApplication",
        entityId: application.id,
        metadata: {
          officeId: office.id,
          userId: user.id,
          approvedBy: context.userId,
        },
      },
    });

    const updatedApplication = await tx.officeApplication.update({
      where: { id: application.id },
      data: { status: "ONAYLANDI", reviewedAt: new Date(), rejectionNote: null },
    });

    return { organization, office, user, updatedApplication };
  });

  const contextAuth = await auth.$context;
  await contextAuth.internalAdapter.linkAccount({
    accountId: result.user.id,
    providerId: "credential",
    userId: result.user.id,
    password: application.passwordHash,
  });

  return NextResponse.json({
    application: {
      id: result.updatedApplication.id,
      status: result.updatedApplication.status,
      reviewedAt: result.updatedApplication.reviewedAt,
    },
    office: { id: result.office.id, name: result.office.name },
    broker: { id: result.user.id, name: result.user.name, email: result.user.email },
    message: "Ofis onaylandı ve Broker hesabı aktif edildi.",
  });
}
