import { Prisma } from "@/generated/prisma/client";

export type CommercialNextAction =
  | "Teklif takip et"
  | "Satış sözleşmesini takip et"
  | "Komisyon bilgisini tamamla"
  | "Tahsilat bekleniyor"
  | "Tahsilat planını takip et"
  | "Satış sonrası ilişkiyi takip et";

export function commercialNextAction(input: {
  event: "OFFER_CREATED" | "OFFER_ACCEPTED" | "SALE_CREATED" | "COMMISSION_UPDATED" | "PAYMENT_PLAN_CREATED" | "PAYMENT_RECEIVED" | "SALE_COMPLETED" | "SALE_CANCELLED";
  remainingAmount?: Prisma.Decimal | number | null;
}) {
  switch (input.event) {
    case "OFFER_CREATED":
      return { label: "Teklif takip et" as const, dueInHours: 24 };
    case "OFFER_ACCEPTED":
      return { label: "Satış sözleşmesini takip et" as const, dueInHours: 24 };
    case "SALE_CREATED":
      return { label: "Komisyon bilgisini tamamla" as const, dueInHours: 24 };
    case "COMMISSION_UPDATED":
      return { label: "Tahsilat bekleniyor" as const, dueInHours: 24 };
    case "PAYMENT_PLAN_CREATED":
      return { label: "Tahsilat planını takip et" as const, dueInHours: 24 };
    case "PAYMENT_RECEIVED":
      return {
        label: input.remainingAmount && Number(input.remainingAmount) > 0 ? "Tahsilat bekleniyor" as const : "Satış sonrası ilişkiyi takip et" as const,
        dueInHours: input.remainingAmount && Number(input.remainingAmount) > 0 ? 24 : 72,
      };
    case "SALE_COMPLETED":
      return { label: "Satış sonrası ilişkiyi takip et" as const, dueInHours: 72 };
    case "SALE_CANCELLED":
      return { label: "Yeni portföy eşleşmesi oluştur" as const, dueInHours: 24 };
  }
}
