export type PrimeActionType = "ARAMA" | "WHATSAPP";

export type PrimeNextAction = {
  action: "showing" | "send_listings" | "follow_up" | "reconnect";
  label: string;
  reason: string;
  dueInHours: number;
  relationshipDelta: number;
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");

function hasAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

export function deriveNextAction(outcome: string | null, action: PrimeActionType): PrimeNextAction {
  const text = outcome?.trim() ?? "";

  if (hasAny(text, ["gosterim", "gösterim", "yerinde bakalim", "yerinde bakalım", "gezmek", "bakalim"])) {
    return {
      action: "showing",
      label: "Uygun portföy için gösterim planla",
      reason: "Temas notunda gösterim veya yerinde inceleme sinyali var.",
      dueInHours: 24,
      relationshipDelta: 8,
    };
  }

  if (hasAny(text, ["begendi", "beğendi", "ilgileniyor", "istiyor", "uygun", "portfoy", "portföy"])) {
    return {
      action: "send_listings",
      label: "Uygun portföyleri müşteriye gönder",
      reason: "Temas notunda aktif ilgi sinyali var.",
      dueInHours: 12,
      relationshipDelta: 6,
    };
  }

  if (hasAny(text, ["ulasilamadi", "ulaşılamadı", "cevap vermedi", "mesgul", "meşgul", "sonra ara", "tekrar ara"])) {
    return {
      action: "reconnect",
      label: "Müşteriyle yeniden temas kur",
      reason: "Müşteriye ulaşılamadığı veya daha sonra aranması gerektiği kaydedildi.",
      dueInHours: 24,
      relationshipDelta: 0,
    };
  }

  return {
    action: "follow_up",
    label: action === "ARAMA" ? "Telefon görüşmesini takip et" : "WhatsApp görüşmesini takip et",
    reason: "Temas sonucu için yeni bir sonraki adım kaydedildi.",
    dueInHours: 24,
    relationshipDelta: 3,
  };
}
