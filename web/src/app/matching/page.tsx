"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Demand = {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  locations: unknown;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  currency: string;
  minSize: string | number | null;
  maxSize: string | number | null;
  rooms: string | null;
  urgency: string;
};

type Customer = {
  id: string;
  name: string;
  relationshipScore: number;
  demands: Demand[];
};

type Match = {
  id: string;
  score: number;
  breakdown: Record<string, number>;
  reasons: { type: "positive" | "warning" | "negative"; title: string; detail: string }[];
  mismatches: string[] | null;
  property: { propertyType: string; title: string; city: string; district: string; neighborhood: string; sizeM2: string | number | null; rooms: string | null };
  listing: { id: string; code: string; title: string; purpose: string; status: string; price: string | number; currency: string; tags: unknown; highlights: unknown } | null;
};

const labelMap: Record<string, string> = {
  SATIN_ALMA: "Satın alma", KIRALAMA: "Kiralama",
  DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", IS_YERI: "İş Yeri", BINA: "Bina", DEVRE_MULK: "Devre Mülk",
  SATILIK: "Satılık", KIRALIK: "Kiralık", YUKSEK: "Yüksek", NORMAL: "Normal", DUSUK: "Düşük",
};

const labels = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
const money = (value: string | number | null, currency: string) =>
  value === null ? "Belirtilmemiş" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Number(value)) + " " + currency;
const range = (min: string | number | null, max: string | number | null, currency: string) => {
  if (min === null && max === null) return "Belirtilmemiş";
  if (min !== null && max !== null) return `${money(min, currency)} – ${money(max, currency)}`;
  return min !== null ? `${money(min, currency)}+` : `≤ ${money(max, currency)}`;
};

export default function MatchingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [demandId, setDemandId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const customer = customers.find((item) => item.id === customerId) ?? null;
  const demand = customer?.demands.find((item) => item.id === demandId) ?? customer?.demands[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customers")
      .then(async (response) => {
        if (!response.ok) throw new Error("Müşteriler alınamadı.");
        return response.json() as Promise<{ customers: Customer[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers);
        const first = data.customers[0];
        setCustomerId(first?.id ?? "");
        setDemandId(first?.demands[0]?.id ?? "");
      })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Veri alınamadı."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const runMatching = async (id = demand?.id) => {
    if (!id) return;
    setRunning(true); setError("");
    try {
      const response = await fetch("/api/matching", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demandId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Eşleştirme çalıştırılamadı.");
      setMatches(data.matches ?? []);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Eşleştirme çalıştırılamadı.");
    } finally { setRunning(false); }
  };

  useEffect(() => {
    if (!demand?.id) return;
    let cancelled = false;
    const loadMatches = async () => {
      setRunning(true);
      setError("");
      try {
        const response = await fetch("/api/matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandId: demand.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Eşleştirme çalıştırılamadı.");
        if (!cancelled) setMatches(data.matches ?? []);
      } catch (cause: unknown) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Eşleştirme çalıştırılamadı.");
      } finally {
        if (!cancelled) setRunning(false);
      }
    };
    void loadMatches();
    return () => { cancelled = true; };
  }, [demand?.id]);

  const stats = useMemo(() => ({
    strong: matches.filter((match) => match.score >= 75).length,
    review: matches.filter((match) => match.score >= 55 && match.score < 75).length,
  }), [matches]);

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-500">Müşteriler ve talepler yükleniyor…</main>;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900">← Dashboard</Link>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">Eşleştirme Motoru · V1</span>
        </div>
        <header className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Müşteri ↔ Portföy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Doğru müşteriye doğru portföyü bul.</h1>
          <p className="mt-2 max-w-3xl text-slate-500">Talep kriterlerini gerçek ofis verisi üzerinden puanla; eşleşme nedenlerini görünür tut ve sonraki aksiyonu danışmana bırak.</p>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Talep seç</p><span className="text-xs text-slate-400">TEK VERİ</span></div>
            <select value={customerId} onChange={(e) => { const next = customers.find((item) => item.id === e.target.value); setCustomerId(e.target.value); setDemandId(next?.demands[0]?.id ?? ""); }} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-slate-400">
              {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="mt-4 space-y-2">
              {customer?.demands.map((item) => <button key={item.id} onClick={() => setDemandId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${item.id === demand?.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{item.title}</span><span className="text-xs font-semibold text-slate-500">{labelMap[item.urgency] ?? item.urgency}</span></div>
                <p className="mt-2 text-sm text-slate-500">{labelMap[item.type] ?? item.type} · {labelMap[item.propertyType] ?? item.propertyType} · {range(item.budgetMin, item.budgetMax, item.currency)}</p>
                <p className="mt-1 text-xs text-slate-400">{labels(item.locations).join(" · ")} · {item.rooms ?? "Oda belirtilmemiş"}</p>
              </button>)}
              {!customer?.demands.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Bu müşterinin aktif talebi yok.</p>}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">Aktif talep</p><h2 className="mt-1 text-2xl font-semibold">{customer?.name ?? "—"}</h2></div><div className="rounded-2xl bg-white/10 px-4 py-3 text-right"><p className="text-xs text-slate-400">İlişki skoru</p><p className="text-xl font-semibold">{customer?.relationshipScore ?? 0}</p></div></div>
            {demand && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Tip", labelMap[demand.propertyType] ?? demand.propertyType], ["Bütçe", range(demand.budgetMin, demand.budgetMax, demand.currency)], ["Alan", range(demand.minSize, demand.maxSize, "m²")], ["Oda", demand.rooms ?? "—"]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div>}
            <div className="mt-5 flex flex-wrap gap-2">{labels(demand?.locations).map((location) => <span key={location} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">{location}</span>)}</div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-semibold text-slate-900">{matches.length} uygun portföy</p><p className="text-xs text-slate-400">Ağırlıklar: tip 20 · bölge 25 · bütçe 20 · m² 10 · özellik 15 · tercih 5 · uygunluk 5</p></div>
            <div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{stats.strong} güçlü</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">{stats.review} incele</span><button onClick={() => void runMatching()} disabled={running || !demand} className="rounded-full bg-slate-950 px-4 py-1.5 font-semibold text-white disabled:opacity-50">{running ? "Hesaplanıyor…" : "Yenile"}</button></div>
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {matches.map((match, index) => (
            <article key={match.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">{index + 1}</div><div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-400">{match.listing?.code ?? "Portföy"}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{labelMap[match.listing?.purpose ?? ""] ?? match.listing?.purpose}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{labelMap[match.property.propertyType] ?? match.property.propertyType}</span></div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{match.listing?.title ?? match.property.title}</h3><p className="mt-1 text-sm text-slate-500">{match.property.neighborhood}, {match.property.district} · {match.property.sizeM2 ? match.property.sizeM2 + " m²" : "m² yok"} · {match.property.rooms ?? "Oda yok"}</p><p className="mt-3 text-lg font-semibold text-slate-950">{money(match.listing?.price ?? null, match.listing?.currency ?? "")}</p>
                </div></div>
                <div className="flex items-center gap-4 xl:w-48 xl:flex-col xl:items-end"><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Uyum skoru</p><p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{match.score}<span className="text-lg text-slate-400">/100</span></p></div><button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">{match.score >= 75 ? "Gösterim planla" : "Portföyü incele"}</button></div>
              </div>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">{match.reasons.slice(0, 6).map((reason, i) => <div key={`${match.id}-${i}`} className={`rounded-2xl p-4 ${reason.type === "positive" ? "bg-emerald-50" : reason.type === "negative" ? "bg-red-50" : "bg-amber-50"}`}><p className={`text-sm font-semibold ${reason.type === "positive" ? "text-emerald-800" : reason.type === "negative" ? "text-red-800" : "text-amber-800"}`}>{reason.type === "positive" ? "✓" : reason.type === "negative" ? "×" : "!"} {reason.title}</p><p className={`mt-1 text-xs ${reason.type === "positive" ? "text-emerald-700" : reason.type === "negative" ? "text-red-700" : "text-amber-700"}`}>{reason.detail}</p></div>)}</div>
              <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs text-slate-400">Skor dağılımı</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(match.breakdown).filter(([key]) => key !== "penalty").map(([label, value]) => <span key={label} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">{label} <b className="text-slate-800">{value}</b></span>)}{match.breakdown.penalty > 0 && <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">Ceza <b>-{match.breakdown.penalty}</b></span>}</div></div>
            </article>
          ))}
          {!matches.length && !running && <div className="rounded-3xl bg-white p-12 text-center ring-1 ring-slate-200"><p className="font-semibold text-slate-900">{demand ? "Uygun portföy bulunamadı." : "Önce aktif bir talep seç."}</p><p className="mt-1 text-sm text-slate-500">Eşleşme yalnızca erişebildiğiniz müşteri talepleri ve ofisin aktif portföy havuzu üzerinden hesaplanır.</p></div>}
        </section>
      </div>
    </main>
  );
}
