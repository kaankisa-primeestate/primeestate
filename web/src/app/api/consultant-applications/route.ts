import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/auth-context";
import { isManagerRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { encryptSecureValue, hashSecureValue, decryptSecureValue } from "@/lib/secure-field";

function normalizeTc(value: string) {
  return value.replace(/\D/g, "");
}

function isValidTc(value: string) {
  if (!/^\d{11}$/.test(value) || value[0] === "0") return false;
  const digits = value.split("").map(Number);
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = (odd * 7 - even) % 10;
  const check11 = digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return check10 === digits[9] && check11 === digits[10];
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function rate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const officeSlug = url.searchParams.get("officeSlug")?.trim().toLowerCase();

  if (officeSlug) {
    const office = await prisma.office.findFirst({
      where: { slug: officeSlug },
      select: { id: true, name: true, organization: { select: { name: true } } },
    });
    if (!office) return NextResponse.json({ message: "Ofis bulunamadı." }, { status: 404 });
    return NextResponse.json({ office: { id: office.id, name: office.name, organizationName: office.organization.name } });
  }

  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!isManagerRole(context.role)) return NextResponse.json({ message: "Yönetici yetkisi gerekli." }, { status: 403 });

  const applications = await prisma.consultantApplication.findMany({
    where: context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN"
      ? { organizationId: context.organizationId }
      : { organizationId: context.organizationId, officeId: context.officeId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    applications: applications.map((item) => ({
      id: item.id,
      officeId: item.officeId,
      firstName: item.firstName,
      lastName: item.lastName,
      tcIdentityNumber: decryptSecureValue(item.tcIdentityEncrypted),
      tcIdentityLast4: item.tcIdentityLast4,
      email: item.email,
      phone: item.phone,
      companyName: item.companyName,
      companyTitle: item.companyTitle,
      companyTaxNumber: item.companyTaxNumber,
      companyPhone: item.companyPhone,
      companyEmail: item.companyEmail,
      commissionModel: item.commissionModel,
      officeShareRate: item.officeShareRate?.toString() ?? null,
      consultantShareRate: item.consultantShareRate?.toString() ?? null,
      status: item.status,
      rejectionNote: item.rejectionNote,
      reviewedByUserId: item.reviewedByUserId,
      reviewedAt: item.reviewedAt,
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const officeSlug = typeof body?.officeSlug === "string" ? body.officeSlug.trim().toLowerCase() : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const tc = normalizeTc(typeof body?.tcIdentityNumber === "string" ? body.tcIdentityNumber : "");
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const companyTitle = typeof body?.companyTitle === "string" ? body.companyTitle.trim() : "";
  const companyTaxNumber = typeof body?.companyTaxNumber === "string" ? body.companyTaxNumber.trim() : "";
  const companyPhone = typeof body?.companyPhone === "string" ? body.companyPhone.trim() : "";
  const companyEmail = typeof body?.companyEmail === "string" ? body.companyEmail.trim().toLowerCase() : "";
  const commissionModel = typeof body?.commissionModel === "string" ? body.commissionModel.trim() : "";
  const officeShareRate = rate(body?.officeShareRate);
  const consultantShareRate = rate(body?.consultantShareRate);

  if (!officeSlug || !firstName || !lastName || !tc || !email || !phone || !password || !companyName || !commissionModel) {
    return NextResponse.json({ message: "Ofis, ad, soyad, T.C. kimlik no, e-posta, telefon, şifre, şirket ve komisyon modeli zorunludur." }, { status: 400 });
  }
  if (!isValidTc(tc)) return NextResponse.json({ message: "Geçerli bir T.C. kimlik numarası girin." }, { status: 400 });
  if (!emailOk(email) || (companyEmail && !emailOk(companyEmail))) return NextResponse.json({ message: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ message: "Şifre 8-128 karakter arasında olmalıdır." }, { status: 400 });
  if (Number.isNaN(officeShareRate) || Number.isNaN(consultantShareRate)) return NextResponse.json({ message: "Komisyon oranları 0-100 arasında olmalıdır." }, { status: 400 });

  const office = await prisma.office.findFirst({
    where: { slug: officeSlug },
    select: { id: true, organizationId: true, name: true },
  });
  if (!office) return NextResponse.json({ message: "Ofis bulunamadı." }, { status: 404 });

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return NextResponse.json({ message: "Bu e-posta adresi zaten kayıtlı." }, { status: 409 });

  const tcHash = hashSecureValue(tc);
  const existing = await prisma.consultantApplication.findFirst({
    where: { officeId: office.id, tcIdentityHash: tcHash, status: "BEKLEMEDE" },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ message: "Bu kimlik bilgileriyle bekleyen bir başvuru zaten var." }, { status: 409 });

  const existingEmail = await prisma.consultantApplication.findFirst({
    where: { officeId: office.id, email, status: "BEKLEMEDE" },
    select: { id: true },
  });
  if (existingEmail) return NextResponse.json({ message: "Bu e-posta ile bekleyen bir başvuru zaten var." }, { status: 409 });

  const contextAuth = await auth.$context;
  const application = await prisma.consultantApplication.create({
    data: {
      organizationId: office.organizationId,
      officeId: office.id,
      firstName,
      lastName,
      tcIdentityEncrypted: encryptSecureValue(tc),
      tcIdentityHash: tcHash,
      tcIdentityLast4: tc.slice(-4),
      email,
      phone,
      companyName,
      companyTitle: companyTitle || null,
      companyTaxNumber: companyTaxNumber || null,
      companyPhone: companyPhone || null,
      companyEmail: companyEmail || null,
      commissionModel,
      officeShareRate,
      consultantShareRate,
      passwordHash: await contextAuth.password.hash(password),
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json({
    application,
    message: "Danışman başvurunuz alındı. Ofis yöneticisinin onayından sonra hesabınız aktif edilecektir.",
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!isManagerRole(context.role)) return NextResponse.json({ message: "Yönetici yetkisi gerekli." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action === "APPROVE" || body?.action === "REJECT" ? body.action : "";
  const rejectionNote = typeof body?.rejectionNote === "string" ? body.rejectionNote.trim() : "";
  if (!id || !action) return NextResponse.json({ message: "Başvuru ve işlem bilgisi zorunludur." }, { status: 400 });

  const application = await prisma.consultantApplication.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
      ...(context.role === "OFFICE_ADMIN" ? { officeId: context.officeId } : {}),
    },
  });
  if (!application) return NextResponse.json({ message: "Başvuru bulunamadı veya yetkiniz yok." }, { status: 404 });
  if (application.status !== "BEKLEMEDE") return NextResponse.json({ message: "Bu başvuru daha önce sonuçlandırılmış." }, { status: 409 });

  if (action === "REJECT") {
    const updated = await prisma.consultantApplication.update({
      where: { id },
      data: { status: "REDDEDILDI", rejectionNote: rejectionNote || null, reviewedByUserId: context.userId, reviewedAt: new Date(), passwordHash: null },
      select: { id: true, status: true, reviewedAt: true },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "CONSULTANT_APPLICATION_REJECTED",
        entityType: "ConsultantApplication",
        entityId: id,
        metadata: { officeId: application.officeId, rejectionNote: rejectionNote || null },
      },
    });
    return NextResponse.json({ application: updated, message: "Danışman başvurusu reddedildi." });
  }

  if (!application.passwordHash) return NextResponse.json({ message: "Başvurunun giriş bilgisi bulunamadı." }, { status: 500 });

  const existingUser = await prisma.user.findUnique({ where: { email: application.email }, select: { id: true } });
  if (existingUser) return NextResponse.json({ message: "Bu e-posta zaten aktif bir kullanıcıya ait." }, { status: 409 });

  const contextAuth = await auth.$context;
  let user: { id: string; name: string; email: string };
  try {
    const created = await contextAuth.internalAdapter.createUser({
      email: application.email,
      name: `${application.firstName} ${application.lastName}`,
      emailVerified: false,
      organizationId: application.organizationId,
      officeId: application.officeId,
      teamId: null,
      role: "AGENT",
      active: true,
    }, { method: "admin-create" });

    await contextAuth.internalAdapter.linkAccount({
      accountId: created.id,
      providerId: "credential",
      userId: created.id,
      password: application.passwordHash,
    });
    user = { id: created.id, name: created.name, email: created.email };
  } catch (error) {
    console.error("PrimeEstate consultant credential creation failed.", error);
    return NextResponse.json({ message: "Danışman hesabı oluşturulamadı. Başvuru tekrar incelenebilir." }, { status: 500 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.consultantApplication.update({
        where: { id: application.id },
        data: { status: "ONAYLANDI", reviewedByUserId: context.userId, reviewedAt: new Date(), passwordHash: null },
        select: { id: true, status: true, reviewedAt: true },
      });

      await tx.consultantProfile.create({
        data: {
          userId: user.id,
          organizationId: application.organizationId,
          officeId: application.officeId,
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          tcIdentityEncrypted: application.tcIdentityEncrypted,
          tcIdentityHash: application.tcIdentityHash,
          tcIdentityLast4: application.tcIdentityLast4,
        },
      });

      await tx.consultantCompany.create({
        data: {
          userId: user.id,
          organizationId: application.organizationId,
          officeId: application.officeId,
          name: application.companyName,
          title: application.companyTitle,
          taxNumber: application.companyTaxNumber,
          phone: application.companyPhone,
          email: application.companyEmail,
        },
      });

      await tx.consultantCommissionPlan.create({
        data: {
          userId: user.id,
          organizationId: application.organizationId,
          officeId: application.officeId,
          model: application.commissionModel,
          officeShareRate: application.officeShareRate,
          consultantShareRate: application.consultantShareRate,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "CONSULTANT_APPLICATION_APPROVED",
          entityType: "ConsultantApplication",
          entityId: application.id,
          metadata: { officeId: application.officeId, userId: user.id, commissionModel: application.commissionModel },
        },
      });
      return result;
    });
    return NextResponse.json({ application: updated, consultant: user, message: "Danışman onaylandı ve hesabı aktif edildi." });
  } catch (error) {
    console.error("PrimeEstate consultant application approval persistence failed.", error);
    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await prisma.account.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    return NextResponse.json({ message: "Onay kaydı tamamlanamadı; danışman hesabı geri alındı." }, { status: 500 });
  }
}
