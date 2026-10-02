"use client";

import { useEffect, useMemo, useState } from "react";

type Installment = { id: string; sequence: number; amount: string | number; currency: string; dueAt: string; status: string; note: string | null; payment?: { id: string; paidAt: string; amount: string | number } | null };
type Plan = { id: string; title: string; currency: string; installments: Installment[] };
type Payment = { id: string; amount: string | number; status: string; ledgerEntries?: Array<{ account: string; amount: string | number }> };

export default function SalePayments({ saleId, saleAmount, currency, approved }: { saleId: string; saleAmount: number; currency: string; approved: boolean }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const [title, setTitle] = useState("Satış ödeme planı");

  async function load() {
    try {
      const [planResponse, paymentResponse] = await Promise.all([
        fetch("/api/payment-plans", { cache: "no-store" }),
        fetch("/api/payments?saleId=" + encodeURIComponent(saleId), { cache: "no-store" }),
      ]);
      const p = await planResponse.json();
      const paymentsPayload = await paymentResponse.json();
      if (!planResponse.ok) throw new Error(p.message ?? "Ödeme planları alınamadı.");
      if (!paymentResponse.ok) throw new Error(paymentsPayload.message ?? "Tahsilatlar alınamadı.");
      setPlan((p.plans ?? []).find((item: Plan & { sale: { id: string } }) => item.sale?.id === saleId) ?? null);
      setPayments(paymentsPayload.payments ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ödeme planı yüklenemedi."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        const [planResponse, paymentResponse] = await Promise.all([
          fetch("/api/payment-plans", { cache: "no-store" }),
          fetch("/api/payments?saleId=" + encodeURIComponent(saleId), { cache: "no-store" }),
        ]);
        const p = await planResponse.json();
        const paymentsPayload = await paymentResponse.json();
        if (!planResponse.ok) throw new Error(p.message ?? "Ödeme planları alınamadı.");
        if (!paymentResponse.ok) throw new Error(paymentsPayload.message ?? "Tahsilatlar alınamadı.");
        if (active) {
          setPlan((p.plans ?? []).find((item: Plan & { sale: { id: string } }) => item.sale?.id === saleId) ?? null);
          setPayments(paymentsPayload.payments ?? []);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Ödeme planı yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialLoad();
    return () => { active = false; };
  }, [saleId]);

  async function createPlan() {
    const n = Math.max(1, Math.min(24, Number(count) || 1));
    const firstDate = new Date();
    firstDate.setDate(firstDate.getDate() + 30);
    const amount = Math.round((saleAmount / n) * 100) / 100;
    const rows = Array.from({ length: n }, (_, index) => {
      const due = new Date(firstDate);
      due.setMonth(due.getMonth() + index);
      const rowAmount = index === n - 1 ? Math.round((saleAmount - amount * (n - 1)) * 100) / 100 : amount;
      return { amount: rowAmount, dueAt: due.toISOString() };
    });
    setCreating(true); setError(null);
    try {
      const r = await fetch("/api/payment-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId, title: title.trim() || "Satış ödeme planı", installments: rows }) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message ?? "Ödeme planı oluşturulamadı.");
      setPlan(p.plan);
    } catch (e) { setError(e instanceof Error ? e.message : "Ödeme planı oluşturulamadı."); }
    finally { setCreating(false); }
  }

  async function pay(id: string) {
    setPaying(id); setError(null);
    try {
      const r = await fetch("/api/payment-installments/" + id + "/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message ?? "Tahsilat oluşturulamadı.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Tahsilat oluşturulamadı."); }
    finally { setPaying(null); }
  }

  const paid = useMemo(() => payments.filter((x) => x.status === "ODENDI").reduce((s, x) => s + Number(x.amount), 0), [payments]);
  const remaining = Math.max(0, saleAmount - paid);
  const officeCollected = useMemo(() => payments.filter((x) => x.status === "ODENDI").flatMap((x) => x.ledgerEntries ?? []).filter((x) => x.account === "OFFICE").reduce((s, x) => s + Number(x.amount), 0), [payments]);
  const consultantCollected = useMemo(() => payments.filter((x) => x.status === "ODENDI").flatMap((x) => x.ledgerEntries ?? []).filter((x) => x.account === "CONSULTANT").reduce((s, x) => s + Number(x.amount), 0), [payments]);

  if (loading) return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="font-semibold">Tahsilat</h2><p className="mt-3 text-sm text-slate-400">Ödeme bilgileri yükleniyor…</p></section>;

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="font-semibold">Ödeme ve tahsilat</h2><p className="mt-1 text-sm text-slate-500">Satış tutarı {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(saleAmount)} · Tahsil edilen {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(paid)} · Kalan {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(remaining)}</p></div>
      {!plan && approved && <div className="flex flex-wrap gap-2"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={count} onChange={(e) => setCount(e.target.value)} type="number" min="1" max="24" className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={creating} onClick={() => void createPlan()} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Oluşturuluyor…" : "Plan oluştur"}</button></div>}
    </div>
    {!approved && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">Ödeme planı ve tahsilat için önce broker onayı gerekir.</p>}
    {payments.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Tahsilat sayısı</p><p className="mt-1 font-semibold">{payments.filter((x) => x.status === "ODENDI").length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Ofis payı tahsilatı</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(officeCollected)}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Danışman payı tahsilatı</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(consultantCollected)}</p></div></div>}
    {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {payments.filter((item) => item.status === "ODENDI").length > 0 && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Gerçekleşen {payments.filter((item) => item.status === "ODENDI").length} tahsilat kaydı satışla ilişkilendirildi. Detaylar ödeme planındaki ilgili taksitlerle birlikte tutuluyor.</p>}
    {plan && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="px-3 py-3">Taksit</th><th className="px-3 py-3">Vade</th><th className="px-3 py-3">Tutar</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3 text-right">İşlem</th></tr></thead><tbody>{plan.installments.map((item) => <tr key={item.id} className="border-b border-slate-50"><td className="px-3 py-3 font-semibold">#{item.sequence}</td><td className="px-3 py-3">{new Date(item.dueAt).toLocaleDateString("tr-TR")}</td><td className="px-3 py-3 font-semibold">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: item.currency }).format(Number(item.amount))}</td><td className="px-3 py-3"><span className={item.status === "ODENDI" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700" : item.status === "IPTAL" ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"}>{item.status === "ODENDI" ? "Ödendi" : item.status === "IPTAL" ? "İptal" : "Bekliyor"}</span></td><td className="px-3 py-3 text-right">{item.status === "BEKLIYOR" && approved && <button disabled={paying === item.id} onClick={() => void pay(item.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{paying === item.id ? "İşleniyor…" : "Tahsilatı al"}</button>}{item.payment && <span className="text-xs text-slate-400">{new Date(item.payment.paidAt).toLocaleDateString("tr-TR")}</span>}</td></tr>)}</tbody></table></div>}
    {!plan && approved && <p className="mt-5 text-sm text-slate-400">Henüz ödeme planı oluşturulmadı.</p>}
  </section>;
}
