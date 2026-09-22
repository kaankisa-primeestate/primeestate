"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Customer = { id: string; name: string };
type Listing = { id: string; code: string; title: string; price: string | number; currency: string; status: string };
type Offer = { id: string; amount: string | number; currency: string; status: string; customer: Customer; listing: { id: string; code: string; title: string } };
type Sale = { id: string; amount: string | number; currency: string; status: string; commissionRate?: string | number | null; officeShareRate?: string | number | null; grossCommission?: string | number | null; customer: Customer; listing: { id: string; code: string; title: string } };

const offerStatuses = ["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"];

export default function PrimeCommercialPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [form, setForm] = useState({ customerId: "", listingId: "", amount: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [commission, setCommission] = useState<Record<string, { rate: string; office: string }>>({});
  const [payment, setPayment] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [c, l, o, s] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/listings?status=AKTIF", { cache: "no-store" }),
        fetch("/api/offers", { cache: "no-store" }),
        fetch("/api/sales", { cache: "no-store" }),
      ]);
      const [cp, lp, op, sp] = await Promise.all([c.json(), l.json(), o.json(), s.json()]);
      if (!c.ok) throw new Error(cp.message ?? "Müşteriler alınamadı.");
      if (!l.ok) throw new Error(lp.message ?? "Portföyler alınamadı.");
      if (!o.ok) throw new Error(op.message ?? "Teklifler alınamadı.");
      if (!s.ok) throw new Error(sp.message ?? "Satışlar alınamadı.");
      setCustomers(cp.customers ?? []);
      setListings(lp.listings ?? []);
      setOffers(op.offers ?? []);
      setSales(sp.sales ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Veriler alınamadı.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const r = await fetch("/api/prime/commercial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message ?? "Prime ticari işlem tamamlanamadı.");
      setMessage(p.next ? `Prime sonraki adımı: ${p.next.label}` : "İşlem tamamlandı.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prime Brain · Commercial Conversion</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Gösterimden Ticari Dönüşüme</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Teklif → kabul → satış → komisyon → tahsilat adımlarının her biri Prime hafızasına yazılır ve müşterinin sonraki aksiyonu otomatik güncellenir.</p>
          </header>

          {message && <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">{message}</div>}

          <section className="grid gap-3 sm:grid-cols-6">
            {["Gösterim", "Teklif", "Kabul", "Satış", "Komisyon", "Tahsilat"].map((item, i) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-[11px] font-bold text-slate-400">0{i + 1}</p><p className="mt-1 text-sm font-semibold text-slate-900">{item}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-950">Yeni teklif</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                <option value="">Müşteri seç</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.listingId} onChange={(e) => setForm({ ...form, listingId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                <option value="">Portföy seç</option>{listings.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.title}</option>)}
              </select>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Teklif tutarı" inputMode="decimal" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
              <button type="button" disabled={!!busy} onClick={() => void post({ action: "OFFER_CREATE", ...form, amount: Number(form.amount) }, "offer")} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "offer" ? "Kaydediliyor…" : "Teklif Oluştur"}</button>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-950">Teklifler</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {offers.map((offer) => (
                <article key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{offer.customer.name}</p><p className="mt-1 text-sm text-slate-500">{offer.listing.code} · {offer.listing.title}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{offer.status}</span></div>
                  <p className="mt-4 text-2xl font-semibold text-slate-950">{Number(offer.amount).toLocaleString("tr-TR")} {offer.currency}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{offerStatuses.filter((s) => s !== offer.status).map((status) => <button key={status} type="button" disabled={!!busy} onClick={() => void post({ action: "OFFER_STATUS", offerId: offer.id, status }, `offer-${offer.id}`)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{status}</button>)}</div>
                  {offer.status === "KABUL" && <p className="mt-3 text-xs font-semibold text-emerald-700">Kabul edildiğinde Prime aynı işlem içinde satış kaydını oluşturur.</p>}
                </article>
              ))}
              {offers.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-400">Henüz teklif yok.</div>}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-950">Satışlar · Komisyon · Tahsilat</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {sales.map((sale) => {
                const c = commission[sale.id] ?? { rate: sale.commissionRate ? String(sale.commissionRate) : "", office: sale.officeShareRate ? String(sale.officeShareRate) : "" };
                return (
                  <article key={sale.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between"><div><p className="font-semibold text-slate-950">{sale.customer.name}</p><p className="mt-1 text-sm text-slate-500">{sale.listing.code} · {sale.listing.title}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{sale.status}</span></div>
                    <p className="mt-4 text-2xl font-semibold">{Number(sale.amount).toLocaleString("tr-TR")} {sale.currency}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2"><input value={c.rate} onChange={(e) => setCommission((x) => ({ ...x, [sale.id]: { ...c, rate: e.target.value } }))} placeholder="Komisyon %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={c.office} onChange={(e) => setCommission((x) => ({ ...x, [sale.id]: { ...c, office: e.target.value } }))} placeholder="Ofis payı %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
                    <button type="button" disabled={!!busy} onClick={() => void post({ action: "SALE_COMMISSION", saleId: sale.id, commissionRate: Number(c.rate), officeShareRate: Number(c.office) }, `commission-${sale.id}`)} className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Komisyonu Kaydet</button>
                    <div className="mt-4 flex gap-2"><input value={payment[sale.id] ?? ""} onChange={(e) => setPayment((x) => ({ ...x, [sale.id]: e.target.value }))} placeholder="Tahsilat tutarı" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button type="button" disabled={!!busy} onClick={() => void post({ action: "PAYMENT", saleId: sale.id, amount: Number(payment[sale.id]), status: "ODENDI" }, `payment-${sale.id}`)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Tahsilat Kaydet</button></div>
                  </article>
                );
              })}
              {sales.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-400">Kabul edilmiş tekliflerden oluşan satışlar burada görünür.</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
