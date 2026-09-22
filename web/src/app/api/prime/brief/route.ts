import { NextResponse } from "next/server";
import { authenticationRequired, forbidden } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

const DAY = 24 * 60 * 60 * 1000;

function matchReasonText(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item) => {
    if (item && typeof item === "object") {
      const record = item as { title?: unknown; detail?: unknown };
      const title = typeof record.title === "string" ? record.title : "";
      const detail = typeof record.detail === "string" ? record.detail : "";
      return detail ? title + ": " + detail : title;
    }
    return String(item);
  }).filter(Boolean);
}

function daysSince(value: Date | null) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - value.getTime()) / DAY));
}

function relationshipHealth(score: number, days: number | null) {
  if ((days ?? 999) >= 30 || score < 50) return "risk" as const;
  if ((days ?? 999) >= 14 || score < 75) return "normal" as const;
  return "strong" as const;
}

function priority(score: number, days: number | null, overdueTasks: number, nextActionAt: Date | null) {
  let value = 0;
  if (days === null || days >= 30) value += 40;
  else if (days >= 14) value += 25;
  if (score < 50) value += 25;
  else if (score < 75) value += 10;
  value += Math.min(overdueTasks * 15, 30);
  if (nextActionAt && nextActionAt.getTime() <= Date.now()) value += 20;
  if (value >= 70) return "critical" as const;
  if (value >= 45) return "high" as const;
  if (value >= 20) return "medium" as const;
  return "low" as const;
}

function actionFor(customer: { nextAction: string | null }, days: number | null, overdueTasks: number) {
  if (overdueTasks > 0) return "follow_up" as const;
  if (customer.nextAction) return "next_action" as const;
  if (days === null || days >= 30) return "call" as const;
  if (days >= 14) return "whatsapp" as const;
  return "maintain" as const;
}

export async function GET() {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "customers", "read")) return forbidden();

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerOwnershipScope(context),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      relationshipScore: true,
      lastContactAt: true,
      nextAction: true,
      nextActionAt: true,
      demands: {
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        take: 2,
        select: {
          title: true,
          matches: {
            orderBy: { score: "desc" },
            take: 3,
            select: {
              id: true,
              score: true,
              reasons: true,
              mismatches: true,
              listing: {
  select: {
    id: true,
    code: true,
    title: true,
    price: true,
    currency: true,
    property: { select: { city: true, district: true, neighborhood: true, sizeM2: true, rooms: true } },
  },
},
            },
          },
        },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 5,
        select: { id: true, type: true, occurredAt: true, summary: true, outcome: true },
      },
      tasks: {
        where: { status: { not: "TAMAMLANDI" } },
        orderBy: { dueAt: "asc" },
        take: 5,
        select: { id: true, title: true, dueAt: true, priority: true, status: true },
      },
    },
    orderBy: [{ nextActionAt: "asc" }, { lastContactAt: "asc" }, { updatedAt: "desc" }],
    take: 50,
  });

  const decisions = customers
    .map((customer) => {
      const days = daysSince(customer.lastContactAt);
      const overdueTasks = customer.tasks.filter((task) => task.dueAt.getTime() < Date.now()).length;
      const health = relationshipHealth(customer.relationshipScore, days);
      const action = actionFor(customer, days, overdueTasks);
      const priorityValue = priority(customer.relationshipScore, days, overdueTasks, customer.nextActionAt);
      const opportunities = customer.demands
        .flatMap((demand) =>
          demand.matches
            .filter((match) => match.listing)
            .map((match) => ({
              id: match.id,
              listingId: match.listing!.id,
              code: match.listing!.code,
              title: match.listing!.title,
              matchScore: match.score,
              price: Number(match.listing!.price),
              currency: match.listing!.currency,
              location: [
                match.listing!.property?.district,
                match.listing!.property?.neighborhood,
              ].filter(Boolean).join(" · "),
              sizeM2: match.listing!.property?.sizeM2 ? Number(match.listing!.property.sizeM2) : null,
              rooms: match.listing!.property?.rooms ?? null,
              reasons: matchReasonText(match.reasons),
              mismatches: Array.isArray(match.mismatches) ? match.mismatches.map(String) : [],
            })),
        )
        .slice(0, 3);

      const reasons = [
        days === null ? "Henüz bir temas tarihi bulunmuyor." : days + " gündür temas edilmedi.",
        customer.relationshipScore < 75 ? "İlişki skoru " + customer.relationshipScore + "." : null,
        overdueTasks > 0 ? overdueTasks + " gecikmiş görev bulunuyor." : null,
        customer.nextAction ? "Kayıtlı sonraki aksiyon: " + customer.nextAction + "." : null,
      ].filter((value): value is string => Boolean(value));

      const talkingPoints = [
        customer.demands[0]?.title ?? null,
        customer.nextAction ?? null,
        customer.activities[0]?.summary ?? null,
      ].filter((value): value is string => Boolean(value));

      return {
        client: { id: customer.id, name: customer.name, phone: customer.phone, relationshipHealth: health },
        objective: action === "maintain" ? "İlişkiyi sıcak tutmak" : "Bir sonraki doğru teması gerçekleştirmek",
        today: {
          action,
          priority: priorityValue,
          confidence: Math.min(95, 55 + reasons.length * 10 + (opportunities.length ? 10 : 0)),
        },
        reasons,
        talkingPoints,
        opportunities,
        risks: health === "risk" ? ["İlişki temas aralığı uzamış olabilir."] : [],
        expectedOutcome:
          action === "call" || action === "follow_up"
            ? "Müşterinin güncel durumunu netleştirmek"
            : "Sonraki adımı belirlemek",
        nextStep: customer.nextAction ?? "Müşteriyle temas planla",
        lastContactAt: customer.lastContactAt,
        lastContactDays: days,
        nextActionAt: customer.nextActionAt,
        openTasks: customer.tasks,
      };
    })
    .filter((item) => item.today.priority !== "low" || item.opportunities.length > 0)
    .sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.today.priority] - order[a.today.priority];
    })
    .slice(0, 8);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    decisions,
  });
}
