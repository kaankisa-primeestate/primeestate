export type DemandPreferenceChanges = {
  budgetMax?: number;
  budgetMin?: number;
  rooms?: string;
  mustHave?: string[];
  mustNotHave?: string[];
  summary: string[];
};

const ATTRIBUTES = [
  "otopark", "kapalı otopark", "açık otopark", "balkon", "teras", "bahçe",
  "asansör", "havuz", "güvenlik", "site", "metro", "metrobüs", "deniz",
  "manzara", "sahil", "merkezi", "yeni bina", "eşyalı", "mobilyalı",
  "ebeveyn banyosu", "depo", "klima", "doğalgaz",
];

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s")
    .replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u");

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

function parseNumber(raw: string, multiplier = 1) {
  const value = raw.replace(/\./g, "").replace(",", ".");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

function parseMoney(text: string) {
  const normalized = normalize(text);
  const million = normalized.match(/(?:butce|butceyi|butceye|bütçe|bütçeyi|bütçeye)?[^.\n]{0,30}?(\d+(?:[.,]\d+)?)\s*(?:milyon|mn)/);
  if (million) return parseNumber(million[1], 1_000_000);

  const thousand = normalized.match(/(?:butce|butceyi|butceye)[^.\n]{0,30}?(\d+(?:[.,]\d+)?)\s*(?:bin|k)/);
  if (thousand) return parseNumber(thousand[1], 1_000);

  return null;
}

function parseRooms(text: string) {
  const match = text.match(/\b([1-9]\d?)\s*\+\s*([0-9])\b/);
  return match ? `${match[1]}+${match[2]}` : null;
}

function mentionedAttributes(text: string) {
  const normalized = normalize(text);
  return unique(ATTRIBUTES.filter((term) => normalized.includes(normalize(term))));
}

export function extractDemandPreferenceChanges(outcome: string): DemandPreferenceChanges {
  const text = outcome.trim();
  const normalized = normalize(text);
  const changes: DemandPreferenceChanges = { summary: [] };

  const money = parseMoney(text);
  if (money !== null && /butce|milyon|mn|bin|\bk\b/.test(normalized)) {
    changes.budgetMax = money;
    changes.summary.push(`Bütçe üst sınırı ${money.toLocaleString("tr-TR")} olarak güncellenecek.`);
  }

  const rooms = parseRooms(text);
  if (rooms) {
    changes.rooms = rooms;
    changes.summary.push(`Oda tercihi ${rooms} olarak güncellenecek.`);
  }

  const attrs = mentionedAttributes(text);
  const negative = /\b(istemiyor|istemem|olmasin|olmasın|gerekmiyor|sart degil|şart değil|sevmiyor|beğenmiyor|beğenmiyor)\b/.test(normalized);
  if (attrs.length) {
    if (negative) {
      changes.mustNotHave = attrs;
      changes.summary.push(`İstenmeyen özellikler: ${attrs.join(", ")}.`);
    } else if (/\b(sart|şart|zorunlu|mutlaka|olmalı|olmali|gerekiyor)\b/.test(normalized)) {
      changes.mustHave = attrs;
      changes.summary.push(`Zorunlu özellikler: ${attrs.join(", ")}.`);
    }
  }

  return changes;
}
