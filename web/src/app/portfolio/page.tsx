"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { portfolios } from "@/data/portfolios";
import type { Portfolio, PortfolioPurpose, PortfolioStatus, PropertyType } from "@/types/Portfolio";

const typeFilters = ["Tümü", "Daire", "Villa", "Arsa", "İş Yeri", "Bina"] as const;
const purposeFilters = ["Tümü", "Satılık", "Kiralık"] as const;

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const styles: Record<PortfolioStatus, string> = {
    Aktif: "bg-emerald-50 text-emerald-700",
    Rezerve: "bg-amber-50 text-amber-700",
    Pasif: "bg-slate-100 text-slate-600",
    Satıldı: "bg-slate-900 text-white",
    Kiralandı: "bg-blue-50 text-blue-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}>{status}</span>;
}

function PortfolioCard({ item, selected, onSelect }: { item: Portfolio; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full overflow-hidden rounded-2xl border text-left transition ${selected ? "border-slate-400 bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}>
      <div className="flex h-36 items-center justify-center bg-slate-100 text-5xl">🏡</div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold tracking-wide text-slate-400">{item.code}</span><StatusBadge status={item.status} /></div>
        <h3 className="mt-2 line-clamp-2 font-semibold leading-5 text-slate-950">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{item.neighborhood} · {item.district}</p>
        <div className="mt-4 flex items-end justify-between gap-3"><p className="font-semibold text-slate-900">{item.price}</p><p className="text-xs text-slate-400">{item.size}</p></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">{tag}</span>)}</div>
      </div>
    </button>
  );
}

function Detail({ item }: { item: Portfolio }) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold tracking-wide text-slate-400">{item.code}</span><StatusBadge status={item.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{item.purpose}</span></div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.location} · {item.neighborhood}</p>
          </div>
          <div className="flex gap-2"><button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Düzenle</button><button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">İlanı Görüntüle</button></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Fiyat", item.price], ["Brüt / net", item.size], ["Oda", item.rooms], ["Kat", item.floor]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{item.highlights.map((highlight) => <span key={highlight} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">{highlight}</span>)}</div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mülkiyet & sorumluluk</p><div className="mt-4 space-y-3"><div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Mal sahibi</span><span className="text-sm font-semibold text-slate-800">{item.owner}</span></div><div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Sorumlu danışman</span><span className="text-sm font-semibold text-slate-800">{item.consultant}</span></div><div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Portföy tarihi</span><span className="text-sm font-semibold text-slate-800">{item.listedAt}</span></div><div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Son güncelleme</span><span className="text-sm font-semibold text-slate-800">{item.updatedAt}</span></div></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Eşleştirme hazırlığı</p><div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-semibold text-slate-950">{item.demandMatches}</p><p className="mt-1 text-sm text-slate-500">uyumlu talep profili</p></div><span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Eşleştirme V1 sonraki aşama</span></div><p className="mt-4 text-sm leading-6 text-slate-500">Portföy ve talep artık ayrı domain kayıtları. Sonraki modülde kriterler bu iki veri kümesini puanlayacak.</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime’ın portföy özeti · V1 önizleme</p><p className="mt-2 text-sm leading-6 text-slate-200">{item.note ?? "Bu portföy için müşteri talepleri, son aktiviteler ve eşleşme sinyalleri sonraki aşamalarda tek çalışma alanında birleşecek."}</p></div><span className="hidden rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 sm:block">AI HAZIRLIK</span></div></div>
    </section>
  );
}

export default function PortfolioPage() {
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<(typeof purposeFilters)[number]>("Tümü");
  const [type, setType] = useState<(typeof typeFilters)[number]>("Tümü");
  const [selectedId, setSelectedId] = useState(portfolios[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return portfolios.filter((item) => {
      const text = `${item.title} ${item.code} ${item.location} ${item.neighborhood} ${item.tags.join(" ")}`.toLocaleLowerCase("tr-TR");
      return (!q || text.includes(q)) && (purpose === "Tümü" || item.purpose === purpose) && (type === "Tümü" || item.propertyType === type);
    });
  }, [query, purpose, type]);

  const selected = portfolios.find((item) => item.id === selectedId) ?? filtered[0] ?? portfolios[0];
  const activeCount = portfolios.filter((item) => item.status === "Aktif").length;
  const saleCount = portfolios.filter((item) => item.purpose === "Satılık").length;
  const rentCount = portfolios.filter((item) => item.purpose === "Kiralık").length;
  const matchCount = portfolios.reduce((sum, item) => sum + item.demandMatches, 0);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
        <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate Workspace</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Portföyler</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Gayrimenkulü tekil bir portföy kaydı olarak yönetin. İlan, mal sahibi, danışman ve talep eşleşmeleri aynı veri yapısının çevresinde buluşur.</p></div><button type="button" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Yeni Portföy</button></div></header>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Aktif Portföy", activeCount], ["Satılık", saleCount], ["Kiralık", rentCount], ["Talep Eşleşmesi", matchCount]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>)}</section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
          <section><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Portföy, mahalle, kod veya özellik ara..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white" /><div className="flex gap-2 overflow-x-auto">{purposeFilters.map((item) => <button key={item} type="button" onClick={() => setPurpose(item)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${purpose === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>{item}</button>)}</div></div><div className="mt-3 flex gap-2 overflow-x-auto">{typeFilters.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${type === item ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}>{item}</button>)}</div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{filtered.map((item) => <PortfolioCard key={item.id} item={item} selected={item.id === selected.id} onSelect={() => setSelectedId(item.id)} />)}</div>
            {filtered.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Filtrelere uyan portföy bulunamadı.</div>}
          </section>
          <div className="min-w-0">{selected && <Detail item={selected} />}</div>
        </div>
      </div></main>
    </div>
  );
}
