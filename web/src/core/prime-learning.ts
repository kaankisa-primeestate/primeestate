export type PrimeLearning = {
  positive: string[];
  negative: string[];
  history: Array<{
    showingId: string;
    status: "GERCEKLESTI" | "IPTAL";
    note: string | null;
    learned: string[];
    direction: "positive" | "negative" | "neutral";
    at: string;
  }>;
};

const POSITIVE = ["begendi", "beğendi", "sevdi", "uygun", "guzel", "güzel", "olumlu", "istiyor", "istedigi", "istediği", "çok iyi", "iyi"];
const NEGATIVE = ["beğenmedi", "beğenmedi", "sevmedi", "uygun degil", "uygun değil", "pahali", "pahalı", "kucuk", "küçük", "buyuk", "büyük", "uzak", "yetersiz", "olumsuz", "istemiyor", "olmadi", "olmadı", "yuksek", "yüksek", "dusuk", "düşük"];

const ATTRIBUTE_TERMS = [
  "otopark", "kapali otopark", "açik otopark", "acik otopark", "balkon", "teras",
  "bahçe", "bahce", "asansör", "asansor", "havuz", "güvenlik", "guvenlik",
  "site", "metro", "metrobüs", "metrobüs", "deniz", "manzara", "sahil",
  "merkezi", "yeni bina", "eşyalı", "esyali", "eşyalı", "mobilyalı", "mobilyali",
  "ebeveyn banyosu", "depo", "otoparklı", "otoparkli", "klima", "doğalgaz", "dogalgaz",
  "yüksek giriş", "yuksek giris", "ara kat", "çatı katı", "cati kati", "zemin kat",
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

function containsAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function removeLearnedSignals(values: string[], learned: string[]) {
  const learnedTerms = new Set(learned.map(normalize));
  return values.filter((value) => !learnedTerms.has(normalize(value)));
}

function applyDirectionalLearning(
  learning: PrimeLearning,
  learned: string[],
  direction: "positive" | "negative" | "neutral",
) {
  const next = {
    positive: [...learning.positive],
    negative: [...learning.negative],
    history: [...learning.history],
  };

  if (!learned.length) return next;

  if (direction === "positive") {
    next.positive = unique([...removeLearnedSignals(next.positive, learned), ...learned]).slice(-30);
    next.negative = removeLearnedSignals(next.negative, learned);
  } else if (direction === "negative") {
    next.negative = unique([...removeLearnedSignals(next.negative, learned), ...learned]).slice(-30);
    next.positive = removeLearnedSignals(next.positive, learned);
  }

  return next;
}

export function emptyPrimeLearning(): PrimeLearning {
  return { positive: [], negative: [], history: [] };
}

export function readPrimeLearning(value: unknown): PrimeLearning {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyPrimeLearning();
  const record = value as Record<string, unknown>;
  const positive = Array.isArray(record.positive) ? record.positive.filter((item): item is string => typeof item === "string") : [];
  const negative = Array.isArray(record.negative) ? record.negative.filter((item): item is string => typeof item === "string") : [];
  const history = Array.isArray(record.history)
    ? record.history.filter((item): item is PrimeLearning["history"][number] =>
        Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).showingId === "string"),
      ).slice(-20)
    : [];
  return { positive: unique(positive), negative: unique(negative), history };
}

export function learnFromShowing(note: string | null, listingText: string) {
  const text = note?.trim() ?? "";
  if (!text) return { learned: [], direction: "neutral" as const };

  const positive = containsAny(text, POSITIVE);
  const negative = containsAny(text, NEGATIVE);
  if (!positive && !negative) return { learned: [], direction: "neutral" as const };

  const learned = ATTRIBUTE_TERMS.filter((term) => normalize(text).includes(normalize(term)));
  const listingAttributes = listingText
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => containsAny(text, [item]));

  return {
    learned: unique([...learned, ...listingAttributes]),
    // Mixed positive/negative feedback is ambiguous at attribute level. Do not
    // turn a mixed sentence into a positive signal just because it contains
    // one positive word; wait for a clearer outcome instead.
    direction: positive && negative ? "neutral" as const : negative ? "negative" as const : "positive" as const,
  };
}

export function applyOutcomeLearning(current: unknown, activityId: string, outcome: string) {
  const learning = readPrimeLearning(current);
  const result = learnFromShowing(outcome, outcome);
  const next = applyDirectionalLearning(learning, result.learned, result.direction);

  next.history = [
    ...next.history.filter((item) => item.showingId !== activityId),
    {
      showingId: activityId,
      status: "GERCEKLESTI" as const,
      note: outcome.trim() || null,
      learned: result.learned,
      direction: result.direction,
      at: new Date().toISOString(),
    },
  ].slice(-20);

  return { learning: next, result };
}

export function applyShowingLearning(current: unknown, showingId: string, status: "GERCEKLESTI" | "IPTAL", note: string | null, listingText: string) {
  const learning = readPrimeLearning(current);
  const result = learnFromShowing(note, listingText);
  const next = applyDirectionalLearning(learning, result.learned, result.direction);

  next.history = [
    ...next.history.filter((item) => item.showingId !== showingId),
    {
      showingId,
      status,
      note,
      learned: result.learned,
      direction: result.direction,
      at: new Date().toISOString(),
    },
  ].slice(-20);

  return { learning: next, result };
}
