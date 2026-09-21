"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Sale = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  commissionRate: string | number | null;
  grossCommission: string | number | null;
  officeShareRate: string | number | null;
  officeShare: string | number | null;
  consultantShare: string | number | null;
  customer: { id: string; name: string };
  listing: { id: string; code: string; title: string };
};

const money = (value: string | number | null, currency: string) =>
  value == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(value));

export default function FinancePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/sales");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Satışlar yüklenemedi.");
      setSales(payload.sales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Satışlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(id: string, commissionRate: string, officeShareRate: string) {
    setSaving(id);
    setError("");
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate, officeShareRate }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Komisyon güncellenemedi.");
      setSales((current) => current.map((sale) => sale.id === id ? payload.sale : sale));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Komisyon güncellenemedi.");
    } finally {
      setSaving(null);
    }
  }

  const completed = sales.filter((sale) => sale.status === "TAMAMLANDI");
  const totalGross = completed.reduce((sum, sale) => sum + Number(sale.grossCommission ?? 0), 0);
  const totalOffice = completed.reduce((sum, sale) => sum + Number(sale.officeShare ?? 0), 0);
  const totalConsultant = completed.reduce((sum, sale) => sum + Number(sale.consultantShare ?? 0), 0);

  return <div className="min-h-screen bg-slate-50 md:flex">
    <Sidebar />
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Finance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Komisyon & Kapanış</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Tamamlanan satışların komisyonunu ve ofis/danışman paylaşımını tek kayıtta hesapla. Oranlar satış bazında saklanır.</p>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[["Toplam komisyon", totalGross], ["Ofis payı", totalOffice], ["Danışman payı", totalConsultant]].map(([label, value]) =>
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value))}</p>
            </div>
          )}
        </section>

        {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <section className="mt-5 space-y-4">
          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Finans verileri yükleniyor…</div>}
          {!loading && sales.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">Henüz satış kaydı yok.</div>}
          {!loading && sales.map((sale) => {
            const commissionRate = sale.commissionRate == null ? "" : String(sale.commissionRate);
            const officeShareRate = sale.officeShareRate == null ? "" : String(sale.officeShareRate);
            return <article key={sale.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === "TAMAMLANDI" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{sale.status === "TAMAMLANDI" ? "Tamamlandı" : "Açık"}</span>
                    <span className="text-xs text-slate-400">{sale.listing.code}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{sale.customer.name} → {sale.listing.title}</h2>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{money(sale.amount, sale.currency)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Komisyon</span><p className="mt-1 font-semibold">{money(sale.grossCommission, sale.currency)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Ofis</span><p className="mt-1 font-semibold">{money(sale.officeShare, sale.currency)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Danışman</span><p className="mt-1 font-semibold">{money(sale.consultantShare, sale.currency)}</p></div>
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); void save(sale.id, String(form.get("commissionRate") ?? ""), String(form.get("officeShareRate") ?? "")); }} className="w-full rounded-2xl bg-slate-50 p-4 lg:max-w-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Satış oranları</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">Komisyon %
                      <input name="commissionRate" defaultValue={commissionRate} required min="0" max="100" step="0.01" type="number" placeholder="Örn. 2" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Ofis payı %
                      <input name="officeShareRate" defaultValue={officeShareRate} required min="0" max="100" step="0.01" type="number" placeholder="Örn. 50" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
                    </label>
                  </div>
                  <button disabled={saving === sale.id} type="submit" className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving === sale.id ? "Hesaplanıyor…" : "Komisyonu hesapla"}</button>
                </form>
              </div>
            </article>;
          })}
        </section>
      </div>
    </main>
  </div>;
}
