"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { customers } from "@/data/customers";
import { portfolios } from "@/data/portfolios";
import { buildMatches } from "@/core/matching";

export default function MatchingPage() {
  const [customerId, setCustomerId] = useState(1);
  const customer = customers.find((item) => item.id === customerId) ?? customers[0];
  const [demandId, setDemandId] = useState(customer.demands[0]?.id ?? 0);
  const demand = customer.demands.find((item) => item.id === demandId) ?? customer.demands[0];
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState("Tümü");
  const [type, setType] = useState("Tümü");

  const matches = useMemo(() => {
    if (!demand) return [];
    return buildMatches(customer, demand, portfolios).filter((match) => {
      const q = query.toLocaleLowerCase("tr-TR");
      const textOk = !q || `${match.portfolio.title} ${match.portfolio.neighborhood} ${match.portfolio.code}`.toLocaleLowerCase("tr-TR").includes(q);
      return textOk && (purpose === "Tümü" || match.portfolio.purpose === purpose) && (type === "Tümü" || match.portfolio.propertyType === type);
    });
  }, [customer, demand, query, purpose, type]);

  const selectCustomer = (id: number) => {
    const next = customers.find((item) => item.id === id) ?? customers[0];
    setCustomerId(id);
    setDemandId(next.demands[0]?.id ?? 0);
  };

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
          <p className="mt-2 max-w-3xl text-slate-500">Talep kriterlerini tek tek değerlendir, uyum skorunu gör ve sonraki aksiyonu doğrudan eşleşmeden başlat.</p>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Talep seç</p><span className="text-xs text-slate-400">TEK VERİ</span></div>
            <select value={customer.id} onChange={(e) => selectCustomer(Number(e.target.value))} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-slate-400">
              {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="mt-4 space-y-2">
              {customer.demands.map((item) => <button key={item.id} onClick={() => setDemandId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${item.id === demand?.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{item.title}</span><span className="text-xs font-semibold text-slate-500">{item.urgency}</span></div>
                <p className="mt-2 text-sm text-slate-500">{item.type} · {item.propertyType} · {item.budget}</p>
                <p className="mt-1 text-xs text-slate-400">{item.locations.join(" · ")} · {item.rooms} · {item.size}</p>
              </button>)}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">Aktif talep</p><h2 className="mt-1 text-2xl font-semibold">{customer.name}</h2></div><div className="rounded-2xl bg-white/10 px-4 py-3 text-right"><p className="text-xs text-slate-400">İlişki skoru</p><p className="text-xl font-semibold">{customer.relationshipScore}</p></div></div>
            {demand && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Tip", demand.propertyType],["Bütçe", demand.budget],["Alan", demand.size],["Oda", demand.rooms]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div>}
            <div className="mt-5 flex flex-wrap gap-2">{demand?.locations.map((location) => <span key={location} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">{location}</span>)}</div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Portföy, mahalle veya kod ara..." className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><option>Tümü</option><option>Satılık</option><option>Kiralık</option></select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><option>Tümü</option><option>Daire</option><option>Villa</option><option>Arsa</option><option>İş Yeri</option><option>Bina</option></select>
          </div>
          <div className="mt-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">{matches.length} eşleşme</p><p className="text-xs text-slate-400">Skor: tip 20 · bölge 25 · bütçe 20 · m² 10 · özellik 15 · tercih 5 · uygunluk 5</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">Otomatik sıralama</span></div>
        </section>

        <section className="mt-5 space-y-4">
          {matches.map((match, index) => <article key={match.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
              <div className="flex min-w-0 flex-1 gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">{index + 1}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-400">{match.portfolio.code}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{match.portfolio.purpose}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{match.portfolio.propertyType}</span></div><h3 className="mt-2 text-xl font-semibold text-slate-950">{match.portfolio.title}</h3><p className="mt-1 text-sm text-slate-500">{match.portfolio.neighborhood}, {match.portfolio.district} · {match.portfolio.size} · {match.portfolio.rooms}</p><p className="mt-3 text-lg font-semibold text-slate-950">{match.portfolio.price}</p></div></div>
              <div className="flex items-center gap-4 xl:w-48 xl:flex-col xl:items-end"><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Uyum skoru</p><p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{match.score}<span className="text-lg text-slate-400">/100</span></p></div><button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">{match.nextAction}</button></div>
            </div>
            <div className="mt-6 grid gap-3 lg:grid-cols-2">{match.reasons.slice(0, 6).map((reason, i) => <div key={`${match.id}-${i}`} className={`rounded-2xl p-4 ${reason.type === "positive" ? "bg-emerald-50" : "bg-amber-50"}`}><p className={`text-sm font-semibold ${reason.type === "positive" ? "text-emerald-800" : "text-amber-800"}`}>{reason.type === "positive" ? "✓" : "!"} {reason.title}</p><p className={`mt-1 text-xs ${reason.type === "positive" ? "text-emerald-700" : "text-amber-700"}`}>{reason.detail}</p></div>)}</div>
            <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs text-slate-400">Skor dağılımı</p><div className="mt-2 flex flex-wrap gap-2">{[["Tip",match.breakdown.category],["Bölge",match.breakdown.location],["Bütçe",match.breakdown.budget],["m²",match.breakdown.size],["Özellik",match.breakdown.features],["Tercih",match.breakdown.preferences],["Uygunluk",match.breakdown.availability]].map(([label,value]) => <span key={label} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">{label} <b className="text-slate-800">{value}</b></span>)}</div></div>
          </article>)}
          {!matches.length && <div className="rounded-3xl bg-white p-12 text-center ring-1 ring-slate-200"><p className="font-semibold text-slate-900">Bu filtrelerle eşleşme bulunamadı.</p><p className="mt-1 text-sm text-slate-500">Filtreleri gevşeterek alternatif portföyleri görebilirsin.</p></div>}
        </section>
      </div>
    </main>
  );
}
