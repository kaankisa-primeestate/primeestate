"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Payment = {
  id: string;
  saleId: string;
  amount: string | number;
  currency: string;
  status: "BEKLIYOR" | "ODENDI" | "IPTAL";
  paidAt: string | null;
  note: string | null;
  ledgerEntries: { id: string; account: "OFFICE" | "CONSULTANT"; amount: string | number; currency: string }[];
  sale: { id: string; amount: string | number; currency: string; customer: { id: string; name: string }; listing: { code: string; title: string } };
};

const money = (value: string | number | null, currency: string) =>
  value == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(value));

const statusLabel: Record<Payment["status"], string> = { BEKLIYOR: "Bekliyor", ODENDI: "Ödendi", IPTAL: "İptal" };

export default function FinancePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [salesResponse, paymentsResponse] = await Promise.all([fetch("/api/sales"), fetch("/api/payments")]);
      const salesPayload = await salesResponse.json();
      const paymentsPayload = await paymentsResponse.json();
      if (!salesResponse.ok) throw new Error(salesPayload.message ?? "Satışlar yüklenemedi.");
      if (!paymentsResponse.ok) throw new Error(paymentsPayload.message ?? "Tahsilatlar yüklenemedi.");
      setSales(salesPayload.sales);
      setPayments(paymentsPayload.payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finans verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function saveCommission(id: string, commissionRate: string, officeShareRate: string) {
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

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentSaving("new");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: String(form.get("saleId") ?? ""),
          amount: String(form.get("amount") ?? ""),
          status: String(form.get("status") ?? "BEKLIYOR"),
          paidAt: form.get("paidAt") ? String(form.get("paidAt")) : undefined,
          note: String(form.get("note") ?? ""),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Tahsilat oluşturulamadı.");
      setPayments((current) => [payload.payment, ...current]);
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tahsilat oluşturulamadı.");
    } finally {
      setPaymentSaving(null);
    }
  }

  async function updatePayment(id: string, status: Payment["status"]) {
    setPaymentSaving(id);
    setError("");
    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Tahsilat güncellenemedi.");
      setPayments((current) => current.map((payment) => payment.id === id ? payload.payment : payment));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tahsilat güncellenemedi.");
    } finally {
      setPaymentSaving(null);
    }
  }

  const completed = sales.filter((sale) => sale.status === "TAMAMLANDI");
  const currencies = Array.from(new Set(completed.map((sale) => sale.currency)));
  const paidByCurrency = payments.filter((p) => p.status === "ODENDI").reduce<Record<string, number>>((acc, payment) => {
    acc[payment.currency] = (acc[payment.currency] ?? 0) + Number(payment.amount);
    return acc;
  }, {});

  return <div className="min-h-screen bg-slate-50 md:flex">
    <Sidebar />
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Finance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Komisyon & Tahsilat</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Satış komisyonunu hesapla, tahsilatı kaydet ve ödeme gerçekleştiğinde ofis/danışman cari kayıtlarını otomatik oluştur.</p>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">Tamamlanan satış</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{completed.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">Ödenen tahsilat</p>
            <div className="mt-1 space-y-1">{Object.entries(paidByCurrency).length ? Object.entries(paidByCurrency).map(([currency, value]) => <p key={currency} className="text-xl font-semibold text-slate-950">{money(value, currency)}</p>) : <p className="text-2xl font-semibold text-slate-950">0</p>}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-400">Aktif para birimleri</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{currencies.length ? currencies.join(" · ") : "—"}</p>
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">Yeni tahsilat</h2><p className="text-sm text-slate-500">Ödendi seçilirse ledger kayıtları aynı işlem içinde oluşur.</p></div>
          </div>
          <form onSubmit={createPayment} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Satış
              <select name="saleId" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900">
                <option value="">Satış seçin</option>
                {sales.filter((sale) => sale.status !== "IPTAL").map((sale) => <option key={sale.id} value={sale.id}>{sale.customer.name} · {sale.listing.code} · {money(sale.amount, sale.currency)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Tutar
              <input name="amount" required min="0.01" step="0.01" type="number" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Durum
              <select name="status" defaultValue="BEKLIYOR" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="BEKLIYOR">Bekliyor</option><option value="ODENDI">Ödendi</option></select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Tarih
              <input name="paidAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-4">Not
              <input name="note" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" placeholder="Kapora, ara ödeme, komisyon tahsilatı..." />
            </label>
            <button disabled={paymentSaving === "new"} type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{paymentSaving === "new" ? "Kaydediliyor…" : "Tahsilatı kaydet"}</button>
          </form>
        </section>

        <section className="mt-6 space-y-4">
          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Finans verileri yükleniyor…</div>}
          {!loading && sales.map((sale) => {
            const commissionRate = sale.commissionRate == null ? "" : String(sale.commissionRate);
            const officeShareRate = sale.officeShareRate == null ? "" : String(sale.officeShareRate);
            const salePayments = payments.filter((payment) => payment.saleId === sale.id);
            return <article key={sale.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === "TAMAMLANDI" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{sale.status === "TAMAMLANDI" ? "Tamamlandı" : sale.status === "IPTAL" ? "İptal" : "Açık"}</span><span className="text-xs text-slate-400">{sale.listing.code}</span></div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{sale.customer.name} → {sale.listing.title}</h2>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{money(sale.amount, sale.currency)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Komisyon</span><p className="mt-1 font-semibold">{money(sale.grossCommission, sale.currency)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Ofis</span><p className="mt-1 font-semibold">{money(sale.officeShare, sale.currency)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Danışman</span><p className="mt-1 font-semibold">{money(sale.consultantShare, sale.currency)}</p></div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Tahsilatlar</h3><span className="text-xs text-slate-400">{salePayments.length} kayıt</span></div>
                    {salePayments.length ? <div className="mt-3 space-y-2">{salePayments.map((payment) => <div key={payment.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="font-semibold text-slate-900">{money(payment.amount, payment.currency)}</p><p className="text-xs text-slate-400">{payment.paidAt ? new Date(payment.paidAt).toLocaleString("tr-TR") : "Tarih bekliyor"} · {statusLabel[payment.status]}</p></div>
                      <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{payment.ledgerEntries.length} cari kayıt</span>{payment.status === "BEKLIYOR" && <button disabled={paymentSaving === payment.id} onClick={() => void updatePayment(payment.id, "ODENDI")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Ödendi</button>}{payment.status === "ODENDI" && <button disabled={paymentSaving === payment.id} onClick={() => void updatePayment(payment.id, "IPTAL")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">İptal</button>}</div>
                    </div>)}</div> : <p className="mt-3 text-xs text-slate-400">Bu satış için henüz tahsilat yok.</p>}
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); void saveCommission(sale.id, String(form.get("commissionRate") ?? ""), String(form.get("officeShareRate") ?? "")); }} className="w-full rounded-2xl bg-slate-50 p-4 xl:max-w-sm">
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
