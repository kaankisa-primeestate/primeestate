import type { ListingPurpose, ListingStatus, PropertyType } from "@/generated/prisma/client";
import { readPrimeLearning } from "@/core/prime-learning";

export const MATCH_WEIGHTS = {
  category: 20,
  location: 25,
  budget: 20,
  size: 10,
  features: 15,
  preferences: 5,
  availability: 5,
} as const;

export type MatchingDemand = {
  propertyType: PropertyType;
  type: "SATIN_ALMA" | "KIRALAMA";
  locations: unknown;
  budgetMin: unknown;
  budgetMax: unknown;
  currency: string;
  minSize: unknown;
  maxSize: unknown;
  rooms: string | null;
  preferences: unknown;
};

export type MatchingListing = {
  id: string;
  propertyId: string;
  purpose: ListingPurpose;
  status: ListingStatus;
  price: unknown;
  currency: string;
  tags: unknown;
  highlights: unknown;
  property: {
    propertyType: PropertyType;
    city: string;
    district: string;
    neighborhood: string;
    sizeM2: unknown;
    rooms: string | null;
  };
};

export type MatchReason = {
  type: "positive" | "warning" | "negative";
  title: string;
  detail: string;
};

export type MatchResult = {
  listingId: string;
  propertyId: string;
  score: number;
  breakdown: {
    category: number;
    location: number;
    budget: number;
    size: number;
    features: number;
    preferences: number;
    availability: number;
    learning: number;
    penalty: number;
  };
  reasons: MatchReason[];
  mismatches: string[];
};

const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const asStrings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();

const preferencesObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function rangeScore(actual: number | null, min: number | null, max: number | null) {
  if (actual === null || (min === null && max === null)) return 0.5;
  if (min !== null && max !== null && actual >= min && actual <= max) return 1;
  if (min !== null && actual < min) return Math.max(0, 1 - (min - actual) / Math.max(min, 30));
  if (max !== null && actual > max) return Math.max(0, 1 - (actual - max) / Math.max(max, 30));
  if (min !== null) return actual >= min ? 1 : Math.max(0, actual / min);
  return actual <= (max as number) ? 1 : 0;
}

function budgetScore(demand: MatchingDemand, listing: MatchingListing) {
  if (demand.currency !== listing.currency) return 0;
  return rangeScore(asNumber(listing.price), asNumber(demand.budgetMin), asNumber(demand.budgetMax));
}

function sizeScore(demand: MatchingDemand, listing: MatchingListing) {
  return rangeScore(asNumber(listing.property.sizeM2), asNumber(demand.minSize), asNumber(demand.maxSize));
}

function roomScore(demandRooms: string | null, listingRooms: string | null) {
  if (!demandRooms || !listingRooms) return 0.5;
  if (normalize(demandRooms) === normalize(listingRooms)) return 1;
  const desired = Number((demandRooms.match(/\d+(?:\.\d+)?/) ?? [])[0]);
  const actual = Number((listingRooms.match(/\d+(?:\.\d+)?/) ?? [])[0]);
  if (!Number.isFinite(desired) || !Number.isFinite(actual)) return 0.5;
  return Math.max(0, 1 - Math.abs(desired - actual) * 0.25);
}

function locationScore(demand: MatchingDemand, listing: MatchingListing) {
  const locations = asStrings(demand.locations).map(normalize);
  if (!locations.length) return 0.5;

  const fields = [listing.property.city, listing.property.district, listing.property.neighborhood].map(normalize);
  if (locations.some((wanted) => fields.some((field) => field === wanted || field.includes(wanted) || wanted.includes(field)))) return 1;
  if (locations.some((wanted) => fields.some((field) => field.split(" ").some((part) => part === wanted)))) return 0.7;
  return 0;
}

function featureScore(demand: MatchingDemand, listing: MatchingListing) {
  const prefs = preferencesObject(demand.preferences);
  const required = [
    ...asStrings(prefs.mustHave),
    ...asStrings(prefs.features),
  ].map(normalize);
  if (!required.length) return roomScore(demand.rooms, listing.property.rooms);

  const available = [...asStrings(listing.tags), ...asStrings(listing.highlights)].map(normalize);
  const matched = required.filter((wanted) => available.some((item) => item.includes(wanted) || wanted.includes(item))).length;
  const room = roomScore(demand.rooms, listing.property.rooms);
  return Math.min(1, (matched / required.length) * 0.7 + room * 0.3);
}



function learningAdjustment(demand: MatchingDemand, listing: MatchingListing) {
  const learning = readPrimeLearning(preferencesObject(demand.preferences).primeLearning);
  if (!learning.positive.length && !learning.negative.length) {
    return { adjustment: 0, positiveMatches: [], negativeMatches: [] };
  }

  const available = [
    ...asStrings(listing.tags),
    ...asStrings(listing.highlights),
    listing.property.city,
    listing.property.district,
    listing.property.neighborhood,
    listing.property.rooms ?? "",
  ].map(normalize);

  const positiveMatches = learning.positive.filter((term) =>
    available.some((item) => item.includes(normalize(term)) || normalize(term).includes(item)),
  );
  const negativeMatches = learning.negative.filter((term) =>
    available.some((item) => item.includes(normalize(term)) || normalize(term).includes(item)),
  );

  const adjustment = Math.min(8, positiveMatches.length * 4) - Math.min(12, negativeMatches.length * 6);
  return { adjustment, positiveMatches, negativeMatches };
}

function preferenceScore(demand: MatchingDemand, listing: MatchingListing) {
  const prefs = preferencesObject(demand.preferences);
  const desired = asStrings(prefs.preferred).map(normalize);
  if (!desired.length) return 0.5;
  const available = [...asStrings(listing.tags), ...asStrings(listing.highlights)].map(normalize);
  const matched = desired.filter((wanted) => available.some((item) => item.includes(wanted) || wanted.includes(item))).length;
  return matched / desired.length;
}

export function calculateMatch(demand: MatchingDemand, listing: MatchingListing): MatchResult {
  const category = demand.propertyType === listing.property.propertyType ? 1 : 0;
  const location = locationScore(demand, listing);
  const budget = budgetScore(demand, listing);
  const size = sizeScore(demand, listing);
  const features = featureScore(demand, listing);
  const preferences = preferenceScore(demand, listing);
  const availability = listing.status === "AKTIF" ? 1 : 0;
  const learning = learningAdjustment(demand, listing);

  const prefs = preferencesObject(demand.preferences);
  const forbidden = asStrings(prefs.mustNotHave).map(normalize);
  const available = [...asStrings(listing.tags), ...asStrings(listing.highlights)].map(normalize);
  const forbiddenMatches = forbidden.filter((wanted) => available.some((item) => item.includes(wanted) || wanted.includes(item)));
  const penalty = Math.min(30, forbiddenMatches.length * 15);

  const breakdown = {
    category: Math.round(category * MATCH_WEIGHTS.category),
    location: Math.round(location * MATCH_WEIGHTS.location),
    budget: Math.round(budget * MATCH_WEIGHTS.budget),
    size: Math.round(size * MATCH_WEIGHTS.size),
    features: Math.round(features * MATCH_WEIGHTS.features),
    preferences: Math.round(preferences * MATCH_WEIGHTS.preferences),
    availability: Math.round(availability * MATCH_WEIGHTS.availability),
    learning: learning.adjustment,
    penalty,
  };

  const score = Math.max(0, Math.min(100, Object.entries(breakdown)
    .filter(([key]) => key !== "penalty")
    .reduce((sum, [, value]) => sum + value, 0) - penalty + learning.adjustment));

  const reasons: MatchReason[] = [];
  const mismatches: string[] = [];

  if (category) reasons.push({ type: "positive", title: "Gayrimenkul tipi uyuyor", detail: "Talep edilen gayrimenkul tipi ile portföy aynı." });
  else { reasons.push({ type: "negative", title: "Gayrimenkul tipi uyuşmuyor", detail: "Talep edilen tip ile portföy tipi farklı." }); mismatches.push("Gayrimenkul tipi"); }

  if (location === 1) reasons.push({ type: "positive", title: "Lokasyon uyuyor", detail: "Portföy talep edilen bölgelerden birinde." });
  else if (location >= 0.7) reasons.push({ type: "warning", title: "Lokasyon kısmen uyuyor", detail: "Lokasyon yakın bir eşleşme sağlıyor." });
  else { reasons.push({ type: "negative", title: "Lokasyon eşleşmiyor", detail: "Portföy talep edilen bölgelerin dışında." }); mismatches.push("Lokasyon"); }

  if (demand.currency !== listing.currency) {
    reasons.push({ type: "negative", title: "Para birimi farklı", detail: `Talep ${demand.currency}, portföy ${listing.currency}.` });
    mismatches.push("Para birimi");
  } else if (budget >= 0.9) reasons.push({ type: "positive", title: "Bütçe uyuyor", detail: "Fiyat talep bütçesi içinde veya çok yakın." });
  else if (budget >= 0.6) reasons.push({ type: "warning", title: "Bütçeye yakın", detail: "Fiyat talep aralığının sınırında." });
  else { reasons.push({ type: "negative", title: "Bütçe uyumsuz", detail: "Fiyat talep bütçesinden belirgin biçimde uzak." }); mismatches.push("Bütçe"); }

  if (size >= 0.9) reasons.push({ type: "positive", title: "m² uyuyor", detail: "Portföy talep edilen alan aralığında." });
  else if (size < 0.5) { reasons.push({ type: "warning", title: "m² farkı var", detail: "Alan talep edilen aralıktan uzak." }); mismatches.push("m²"); }

  if (features >= 0.9) reasons.push({ type: "positive", title: "Temel özellikler uyuyor", detail: "Oda ve istenen özelliklerin çoğu karşılanıyor." });
  else if (features < 0.6) { reasons.push({ type: "warning", title: "Özelliklerde eksik var", detail: "Bazı temel özellikler karşılanmıyor." }); mismatches.push("Temel özellikler"); }

  if (learning.positiveMatches.length) {
    reasons.push({
      type: "positive",
      title: "Prime öğrenilen tercih eşleşiyor",
      detail: learning.positiveMatches.slice(0, 2).join(", ") + " daha önce olumlu geri bildirim aldı.",
    });
  }

  if (learning.negativeMatches.length) {
    reasons.push({
      type: "negative",
      title: "Prime öğrenilen tercih ile çakışıyor",
      detail: learning.negativeMatches.slice(0, 2).join(", ") + " daha önce olumsuz geri bildirim aldı.",
    });
    mismatches.push("Öğrenilmiş tercih");
  }

  if (forbiddenMatches.length) {
    reasons.push({ type: "negative", title: "İstenmeyen özellik bulundu", detail: `Must-not-have: ${forbiddenMatches.join(", ")}.` });
    mismatches.push("Must-not-have");
  }

  return { listingId: listing.id, propertyId: listing.propertyId, score, breakdown, reasons, mismatches };
}
