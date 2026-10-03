"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Consultant = {
  id: string;
  name: string;
  active: boolean;
  consultantCommissionPlan: {
    rentAmount: string | null;
    rentCurrency: string;
    rentStartDate: string | null;
    rentDueDay: number | null;
    active: boolean;
    termsNote: string | null;
  } | null;
};

type Fee = {
  id: string;
  consultantUserId: string;
  period: string;
  amount: string;
  currency: string;
  dueAt: string;
  status: "BEKLIYOR" | "ODENDI" | "IPTAL";
  paidAt: string | null;
  note: string | null;
  consultant: { id: string; name: string; active: boolean };
};

const money = (value: string | number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(value));

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ConsultantFeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [period, setPeriod] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/consultant-fees", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Aidat verileri yüklenemedi.");
      setFees(data.fees ?? []);
      setConsultants(data.consultants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aidat verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function generateMonth() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/consultant-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Aidatlar oluşturulamadı.");
      setNotice(data.message ?? "Aidatlar hazırlandı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aidatlar oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: Fee["status"]) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/consultant-fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Aidat güncellenemedi.");
      setNotice(data.message ?? "Aidat güncellendi.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aidat güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  const monthFees = useMemo(() => fees.filter((fee) => fee.period.slice(0, 7) === period), [fees, period]);
  const overdue = monthFees.filter((fee) => fee.status === "BEKLIYOR" && new Date(fee.dueAt) < new Date());
  const paid = monthFees.filter((fee) => fee.status === "ODENDI");
  const pending = monthFees.filter((fee) => fee.status === "BEKLIYOR" && new Date(fee.dueAt) >= new Date());

  const totals = useMemo(() => {
    const sum = (items: Fee[]) => items.reduce<Record<string, number>>((acc, fee) => {
      acc[fee.currency] = (acc[fee.currency] ?? 0) + Number(fee.amount);
      return acc;
    }, {});
    return { all: sum(monthFees), paid: sum(paid), overdue: sum(overdue) };
  }, [monthFees, paid, overdue]);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Yönetim</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Danışman Aidatları</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Ofisin danışmanlardan alacağı aylık aidatları takip edin. Satış komisyonlarından bağımsızdır.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
              <button type="button" onClick={generateMonth} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "İşleniyor…" : "Seçili dönemin aidatlarını oluştur"}
              </button>
            </div>
          </div>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {notice ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-400">Kayıtlı aidat</p><p className="mt-1 text-2xl font-semibold">{monthFees.length}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-400">Tahsil edilen</p><p className="mt-1 text-2xl font-semibold">{Object.entries(totals.paid).map(([c,v]) => money(v,c)).join(" · ") || "0"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-400">Bekleyen</p><p className="mt-1 text-2xl font-semibold">{pending.length}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-400">Geciken</p><p className="mt-1 text-2xl font-semibold text-red-600">{overdue.length}</p></div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-950">Danışmanlar</h2>
              <p className="mt-1 text-sm text-slate-500">Aidat tutarı, danışmanın aktif komisyon/aidat planından alınır.</p>
            </div>
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Aidatlar yükleniyor…</div> : (
              <div className="divide-y divide-slate-100">
                {consultants.map((consultant) => {
                  const fee = monthFees.find((item) => item.consultantUserId === consultant.id);
                  const plan = consultant.consultantCommissionPlan;
                  const isOverdue = fee?.status === "BEKLIYOR" && new Date(fee.dueAt) < new Date();
                  return (
                    <article key={consultant.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-950">{consultant.name} {!consultant.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Pasif</span>}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Plan: {plan?.rentAmount ? money(plan.rentAmount, plan.rentCurrency) : "Aidat tutarı tanımlı değil"}
                            {plan?.rentDueDay ? ` · Vade günü: ${plan.rentDueDay}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {fee ? (
                            <>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fee.status === "ODENDI" ? "bg-emerald-50 text-emerald-700" : isOverdue ? "bg-red-50 text-red-700" : fee.status === "IPTAL" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>
                                {fee.status === "ODENDI" ? "Ödendi" : fee.status === "IPTAL" ? "İptal" : isOverdue ? "Gecikti" : "Bekliyor"}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{money(fee.amount, fee.currency)}</span>
                              <span className="text-xs text-slate-400">Vade: {new Date(fee.dueAt).toLocaleDateString("tr-TR")}</span>
                              {fee.status !== "ODENDI" ? (
                                <button type="button" disabled={saving} onClick={() => void updateStatus(fee.id, "ODENDI")} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Ödemeyi al</button>
                              ) : (
                                <button type="button" disabled={saving} onClick={() => void updateStatus(fee.id, "BEKLIYOR")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">Geri al</button>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">Bu dönem için kayıt yok</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!consultants.length ? <div className="p-8 text-center text-sm text-slate-500">Aktif danışman bulunamadı.</div> : null}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
