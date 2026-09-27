"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Sale = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  approvalStatus: "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI";
  commissionRate: string | number | null;
  grossCommission: string | number | null;
  officeShareRate: string | number | null;
  sourceOfficeShareRate: string | number | null;
  sourceConsultantShareRate: string | number | null;
  sourceCommissionPlanId: string | null;
  officeShare: string | number | null;
  consultantShare: string | number | null;
  customer: { id: string; name: string };
  listing: { id: string; code: string; title: string };
};

type PaymentPlan = {
  id: string;
  title: string;
  currency: string;
  saleId: string;
  installments: { id: string; sequence: number; amount: string | number; currency: string; dueAt: string; status: string; note: string | null }[];
  sale: { id: string; amount: string | number; currency: string; customer: { id: string; name: string }; listing: { code: string; title: string } };
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
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [planSaving, setPlanSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [salesResponse, paymentsResponse, plansResponse] = await Promise.all([fetch("/api/sales"), fetch("/api/payments"), fetch("/api/payment-plans")]);
      const salesPayload = await salesResponse.json();
      const paymentsPayload = await paymentsResponse.json();
      const plansPayload = await plansResponse.json();
      if (!salesResponse.ok) throw new Error(salesPayload.message ?? "Satışlar yüklenemedi.");
      if (!paymentsResponse.ok) throw new Error(paymentsPayload.message ?? "Tahsilatlar yüklenemedi.");
      if (!plansResponse.ok) throw new Error(plansPayload.message ?? "Ödeme planları yüklenemedi.");
      setSales(salesPayload.sales);
      setPayments(paymentsPayload.payments);
      setPaymentPlans(plansPayload.plans);
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

  async function payInstallment(id: string) {
    setPaymentSaving(id);
    setError("");
    try {
      const response = await fetch(`/api/payment-installments/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Taksit tahsil edilemedi.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Taksit tahsil edilemedi.");
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

  async function createPaymentPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving("new");
    setError("");
    const form = new FormData(event.currentTarget);
    const saleId = String(form.get("saleId") ?? "");
    const title = String(form.get("title") ?? "").trim();
    const count = Math.max(1, Math.min(24, Number(form.get("count") ?? 1)));
    const firstDueAt = String(form.get("firstDueAt") ?? "");
    const sale = approvedSales.find((item) => item.id === saleId);
    try {
      if (!sale) throw new Error("Onaylanmış bir satış seçin.");
      if (!Number.isFinite(count) || !firstDueAt) throw new Error("Taksit sayısı ve ilk vade tarihi zorunludur.");
      if (paymentPlans.some((plan) => plan.saleId === saleId)) throw new Error("Bu satış için zaten bir ödeme planı var.");
      const total = Number(sale.amount);
      const base = Math.floor((total / count) * 100) / 100;
      const installments = Array.from({ length: count }, (_, index) => ({
        amount: index === count - 1 ? Number((total - base * (count - 1)).toFixed(2)) : Number(base.toFixed(2)),
        dueAt: (() => {
          const date = new Date(firstDueAt);
          date.setMonth(date.getMonth() + index);
          return date.toISOString();
        })(),
      }));
      const response = await fetch("/api/payment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, title, installments }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Ödeme planı oluşturulamadı.");
      setPaymentPlans((current) => [payload.plan, ...current]);
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ödeme planı oluşturulamadı.");
    } finally {
      setPlanSaving(null);
    }
  }

  const approvedSales = sales.filter((sale) => sale.approvalStatus === "ONAYLANDI");
  const completed = approvedSales.filter((sale) => sale.status === "TAMAMLANDI");
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Broker tarafından onaylanmış satışların komisyon ve tahsilatını takip et. Onay bekleyen satışlar önce İş Akışı üzerinden kesinleşir.</p>

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
                {approvedSales.filter((sale) => sale.status !== "IPTAL").map((sale) => <option key={sale.id} value={sale.id}>{sale.customer.name} · {sale.listing.code} · {money(sale.amount, sale.currency)}</option>)}
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">Ödeme planı / taksit</h2><p className="text-sm text-slate-500">Yalnızca broker tarafından onaylanmış satış için oluşturulur. Taksit toplamı satış tutarına otomatik eşitlenir.</p></div>
          </div>
          <form onSubmit={createPaymentPlan} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Onaylı satış
              <select name="saleId" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900">
                <option value="">Satış seçin</option>
                {approvedSales.filter((sale) => sale.status !== "IPTAL" && !paymentPlans.some((plan) => plan.saleId === sale.id)).map((sale) => <option key={sale.id} value={sale.id}>{sale.customer.name} · {sale.listing.code} · {money(sale.amount, sale.currency)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Plan adı
              <input name="title" required defaultValue="Standart ödeme planı" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Taksit sayısı
              <input name="count" required min="1" max="24" defaultValue="3" type="number" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-slate-600">İlk vade
              <input name="firstDueAt" required type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <button disabled={planSaving === "new"} type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{planSaving === "new" ? "Oluşturuluyor…" : "Ödeme planı oluştur"}</button>
          </form>
          {paymentPlans.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{paymentPlans.map((plan) => <div key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{plan.title}</p><p className="mt-1 text-xs text-slate-500">{plan.sale.customer.name} · {plan.sale.listing.code}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{plan.installments.length} taksit</span></div>
            <div className="mt-3 space-y-2">{plan.installments.map((installment) => <div key={installment.id} className="flex flex-col gap-2 rounded-xl bg-white px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold">{installment.sequence}. taksit</span><span className="ml-2 text-xs text-slate-400">{new Date(installment.dueAt).toLocaleDateString("tr-TR")}</span><span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${installment.status === "ODENDI" ? "bg-emerald-50 text-emerald-700" : installment.status === "IPTAL" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"`}>{installment.status === "ODENDI" ? "Ödendi" : installment.status === "IPTAL" ? "İptal" : "Bekliyor"}</span></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="font-semibold text-slate-900">{money(installment.amount, installment.currency)}</span>{installment.status === "BEKLIYOR" && <button disabled={paymentSaving === installment.id} onClick={() => void payInstallment(installment.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{paymentSaving === installment.id ? "İşleniyor…" : "Tahsil et"}</button>}</div></div>)}</div>
          </div>)}</div> : <p className="mt-4 text-xs text-slate-400">Henüz oluşturulmuş ödeme planı yok.</p>}
        </section>

        <section className="mt-6 space-y-4">
          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Finans verileri yükleniyor…</div>}
          {!loading && approvedSales.map((sale) => {
            const commissionRate = sale.commissionRate == null ? "" : String(sale.commissionRate);
            const officeShareRate = sale.officeShareRate == null ? "" : String(sale.officeShareRate);
            const salePayments = payments.filter((payment) => payment.saleId === sale.id);
             const statusClass = sale.status === "TAMAMLANDI" ? "rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700" : sale.status === "IPTAL" ? "rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700" : "rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700";
            return <article key={sale.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className={statusClass}>
                       {sale.status === "TAMAMLANDI" ? "Tamamlandı" : sale.status === "IPTAL" ? "İptal" : "Açık"}
                     </span>
                     <span className="text-xs text-slate-400">{sale.listing.code}</span>
                   </div>
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
                   <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Satış oranları</p><div className="mt-3 rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-slate-700">Ofis kaynağı</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">Ofis payı</span><p className="mt-1 font-semibold text-slate-900">{sale.sourceOfficeShareRate != null ? {"%" + sale.sourceOfficeShareRate} : "Tanımlı değil"}</p></div><div><span className="text-slate-400">Danışman payı</span><p className="mt-1 font-semibold text-slate-900">{sale.sourceConsultantShareRate != null ? {"%" + sale.sourceConsultantShareRate} : "Tanımlı değil"}</p></div></div><p className="mt-2 text-[11px] leading-4 text-slate-500">Satış oluşturulurken ofisteki danışman kaydından alınan sabit kaynak oranları.</p></div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">Komisyon %
                      <input name="commissionRate" defaultValue={commissionRate} required min="0" max="100" step="0.01" type="number" placeholder="Örn. 2" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Ofis payı % <span className="font-normal text-slate-400">(manuel)</span>
                      <input name="officeShareRate" defaultValue={officeShareRate} required min="0" max="100" step="0.01" type="number" placeholder="Örn. 50" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" />
                    </label>
                  </div>
                  <p className="mt-3 text-[11px] leading-4 text-slate-500">Gerekirse bu satış için manuel oran girilebilir. Broker onayından sonra oranlar kilitlenir.</p><button disabled={saving === sale.id || sale.approvalStatus !== "BEKLIYOR"} type="submit" className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving === sale.id ? "Hesaplanıyor…" : "Komisyonu hesapla"}</button>
                </form>
              </div>
            </article>;
          })}
        </section>
      </div>
    </main>
  </div>;
}
