import type { Customer, Demand } from "../types/Customer";
import type { Portfolio } from "../types/Portfolio";
import type { MatchReason, MatchScoreBreakdown, PropertyMatch } from "../types/Matching";

const WEIGHTS = { category: 20, location: 25, budget: 20, size: 10, features: 15, preferences: 5, availability: 5 };

function numbers(text: string) {
  return [...text.replace(/\./g, "").matchAll(/[\d]+(?:,[\d]+)?/g)].map((m) => Number(m[0].replace(",", ".")));
}

function rangeFromText(text: string): [number, number] | null {
  const n = numbers(text);
  if (!n.length) return null;
  if (n.length === 1) return [n[0], n[0]];
  return [Math.min(n[0], n[1]), Math.max(n[0], n[1])];
}

function sizeScore(demand: Demand, portfolio: Portfolio) {
  const d = rangeFromText(demand.size);
  const p = numbers(portfolio.size)[0];
  if (!d || !p) return 0.5;
  if (p >= d[0] && p <= d[1]) return 1;
  const distance = p < d[0] ? d[0] - p : p - d[1];
  return Math.max(0, 1 - distance / Math.max(d[1] - d[0], 30));
}

function budgetScore(demand: Demand, portfolio: Portfolio) {
  const d = rangeFromText(demand.budget);
  if (!d) return 0.55;
  const p = portfolio.priceValue;
  if (p >= d[0] && p <= d[1]) return 1;
  if (p < d[0]) return 0.9;
  return Math.max(0, 1 - (p - d[1]) / Math.max(d[1] - d[0], d[1] * 0.25));
}

function roomScore(demand: Demand, portfolio: Portfolio) {
  if (demand.rooms === portfolio.rooms) return 1;
  const desired = numbers(demand.rooms)[0];
  const actual = numbers(portfolio.rooms)[0];
  if (!desired || !actual) return 0.5;
  return Math.max(0, 1 - Math.abs(desired - actual) * 0.25);
}

function calculate(demand: Demand, portfolio: Portfolio): Omit<PropertyMatch, "id" | "customer" | "demand" | "portfolio"> {
  const category = demand.propertyType === portfolio.propertyType ? 1 : 0;
  const location = demand.locations.some((x) => portfolio.neighborhood.toLocaleLowerCase("tr-TR").includes(x.toLocaleLowerCase("tr-TR"))) ? 1 : 0.35;
  const budget = budgetScore(demand, portfolio);
  const size = sizeScore(demand, portfolio);
  const features = roomScore(demand, portfolio);
  const preferences = portfolio.tags.some((tag) => /metro|marmaray|ulaşım|sahil|otopark/i.test(tag)) ? 0.9 : 0.55;
  const availability = portfolio.status === "Aktif" ? 1 : portfolio.status === "Rezerve" ? 0.35 : 0;
  const penalty = category === 0 ? 20 : budget < 0.35 ? 10 : 0;

  const breakdown: MatchScoreBreakdown = {
    category: Math.round(category * WEIGHTS.category), location: Math.round(location * WEIGHTS.location),
    budget: Math.round(budget * WEIGHTS.budget), size: Math.round(size * WEIGHTS.size),
    features: Math.round(features * WEIGHTS.features), preferences: Math.round(preferences * WEIGHTS.preferences),
    availability: Math.round(availability * WEIGHTS.availability), penalty,
  };
  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0) - penalty;
  const score = Math.max(0, Math.min(100, raw));
  const reasons: MatchReason[] = [];
  if (category) reasons.push({ type: "positive", title: "Gayrimenkul tipi uyuyor", detail: `${portfolio.propertyType} talebi karşılıyor.` });
  else reasons.push({ type: "warning", title: "Tip uyumsuzluğu", detail: `Talep ${demand.propertyType}, portföy ${portfolio.propertyType}.` });
  if (location === 1) reasons.push({ type: "positive", title: "Bölge tam uyum", detail: `${portfolio.neighborhood} talep edilen bölgelerden biri.` });
  else reasons.push({ type: "warning", title: "Bölge dışı", detail: "Talep edilen lokasyonlarla doğrudan eşleşmiyor." });
  if (budget >= 0.95) reasons.push({ type: "positive", title: "Bütçe aralığında", detail: portfolio.price });
  else if (budget >= 0.6) reasons.push({ type: "warning", title: "Bütçeye yakın", detail: "Fiyat talep aralığının sınırında." });
  else reasons.push({ type: "warning", title: "Bütçe riski", detail: "Fiyat talep bütçesinin üzerinde olabilir." });
  if (size >= 0.9) reasons.push({ type: "positive", title: "Metrekare uyuyor", detail: `${portfolio.size} talep edilen aralıkta.` });
  if (features >= 0.9) reasons.push({ type: "positive", title: "Oda tercihi uyuyor", detail: portfolio.rooms });
  if (availability < 0.7) reasons.push({ type: "warning", title: "Durum kontrolü", detail: `Portföy şu anda ${portfolio.status.toLocaleLowerCase("tr-TR")}.` });

  return { score, breakdown, reasons, nextAction: score >= 75 ? "Gösterim planla" : score >= 55 ? "Portföyü incele" : "Alternatif ara" };
}

export function buildMatches(customer: Customer, demand: Demand, portfolios: Portfolio[]): PropertyMatch[] {
  return portfolios.map((portfolio) => ({
    id: `${customer.id}-${demand.id}-${portfolio.id}`, customer: { id: customer.id, name: customer.name, initials: customer.initials },
    demand, portfolio, ...calculate(demand, portfolio),
  })).sort((a, b) => b.score - a.score);
}
