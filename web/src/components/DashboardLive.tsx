"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type T = { id: string; title: string; dueAt: string; priority: string; status: string; customer: { name: string } | null };
type L = { id: string; code: string; title: string; price: string | number; currency: string; status: string; property?: { district?: string; neighborhood?: string } };
type A = { id: string; occurredAt: string; summary: string; customer: { name: string } };
type S = { id: string; dateTime: string; customer: { name: string }; listing: { code: string; title: string } };
type C = { id: string; name: string };
type O = { id: string; status: string };
type Sale = { id: string; status: string; amount: string | number; currency: string; customer: { name: string }; listing: { code: string; title: string } };
type Payment = { id: string; saleId: string; amount: string | number; currency: string; status: string; paidAt: string | null; sale: { id: string; customer: { name: string }; listing: { code: string } } };
type Installment = { id: string; amount: string | number; currency: string; dueAt: string; status: string };
type Plan = { id: string; title: string; currency: string; installments: Installment[]; sale: { id: string } };

async function g<T>(u: string): Promise<T> {
  const r = await fetch(u, { cache: "no-store" });
  const body = await r.text();
  let data: unknown = null;

  if (body.trim()) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Dashboard API yanıtı geçersiz: ${u} (${r.status})`);
    }
  }

  if (!r.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `API ${r.status} yanıtı`;
    throw new Error(`${message} — ${u}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error(`Dashboard API boş yanıt döndürdü: ${u}`);
  }

  return data as T;
}

const dt = (v: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

const money = (v: string | number, c = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: c }).format(Number(v));

export default function DashboardLive() {
  const [customers, setCustomers] = useState<C[]>([]);
  const [tasks, setTasks] = useState<T[]>([]);
  const [listings, setListings] = useState<L[]>([]);
  const [activities, setActivities] = useState<A[]>([]);
  const [showings, setShowings] = useState<S[]>([]);
  const [offers, setOffers] = useState<O[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setBusy(true);
    setErr("");

    const requests = [
      g<{ customers: C[] }>("/api/customers"),
      g<{ tasks: T[] }>("/api/tasks?limit=50"),
      g<{ listings: L[] }>("/api/listings?status=AKTIF"),
      g<{ activities: A[] }>("/api/activities?limit=20"),
      g<{ showings: S[] }>("/api/showings"),
      g<{ offers: O[] }>("/api/offers"),
      g<{ sales: Sale[] }>("/api/sales"),
      g<{ payments: Payment[] }>("/api/payments"),
      g<{ plans: Plan[] }>("/api/payment-plans"),
    ] as const;

    const results = await Promise.allSettled(requests);
    const failed = results
      .map((result, index) => (result.status === "rejected" ? { index, reason: result.reason } : null))
      .filter((item): item is { index: number; reason: unknown } => item !== null);

    const [c, t, l, a, s, o, sale, payment, plan] = results;
    setCustomers(c.status === "fulfilled" ? c.value.customers : []);
    setTasks(t.status === "fulfilled" ? t.value.tasks : []);
    setListings(l.status === "fulfilled" ? l.value.listings : []);
    setActivities(a.status === "fulfilled" ? a.value.activities : []);
    setShowings(s.status === "fulfilled" ? s.value.showings : []);
    setOffers(o.status === "fulfilled" ? o.value.offers : []);
    setSales(sale.status === "fulfilled" ? sale.value.sales : []);
    setPayments(payment.status === "fulfilled" ? payment.value.payments : []);
    setPlans(plan.status === "fulfilled" ? plan.value.plans : []);
    setLastUpdated(new Date());

    if (failed.length) {
      const first = failed[0].reason;
      setErr(
        first instanceof Error
          ? `Dashboard verilerinin bir kısmı alınamadı. ${first.message}`
          : "Dashboard verilerinin bir kısmı alınamadı. Sayfa otomatik olarak tekrar denenecek.",
      );
    }

    setBusy(false);
  }

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const interval = setInterval(() => void load(), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  const openTasks = tasks.filter((x) => x.status !== "TAMAMLANDI");
  const openOffers = offers.filter((x) => !["KABUL", "REDDEDILDI"].includes(x.status));
  const openSales = sales.filter((x) => x.status === "ACIK");
  const paidByCurrency = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "ODENDI")
        .reduce<Record<string, number>>((acc, payment) => {
          acc[payment.currency] = (acc[payment.currency] ?? 0) + Number(payment.amount);
          return acc;
        }, {}),
    [payments],
  );
  const pendingInstallments = useMemo(
    () => plans.flatMap((plan) => plan.installments).filter((item) => item.status === "BEKLIYOR"),
    [plans],
  );
  const overdueInstallments = pendingInstallments.filter((item) => Date.parse(item.dueAt) < Date.now());
  const today = new Date().toDateString();
  const todayShowings = showings.filter((x) => new Date(x.dateTime).toDateString() === today);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-400">PrimeEstate · Live Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold">Günaydın, Kaan.</h1>
              <p className="mt-2 text-sm text-slate-500">Dashboard gerçek CRM verileriyle çalışıyor ve 30 saniyede bir yenileniyor.</p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="hidden text-xs text-slate-400 sm:inline">
                  Son güncelleme {lastUpdated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button onClick={() => void load()} disabled={busy} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {busy ? "Yükleniyor…" : "↻ Yenile"}
              </button>
            </div>
          </header>

          {err && <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{err}</div>}

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["👥", "Müşteriler", customers.length, "/relationships"],
              ["🏡", "Aktif Portföy", listings.length, "/portfolio"],
              ["🔥", "Açık Fırsat", openOffers.length, "/sales"],
              ["💼", "Açık Satış", openSales.length, "/finance"],
            ].map(([icon, title, value, href]) => (
              <Link key={String(title)} href={String(href)} className="rounded-2xl border bg-white p-5 shadow-sm">
                <span className="text-2xl">{icon}</span>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">{title}</p>
                <p className="mt-1 text-3xl font-bold">{busy ? "—" : value}</p>
              </Link>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Finans Özeti</p>
                <h2 className="mt-1 text-xl font-semibold">Satıştan tahsilata canlı görünüm</h2>
              </div>
              <Link href="/finance" className="text-sm font-semibold">Finans workspace →</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Açık satış</p>
                <p className="mt-1 text-2xl font-semibold">{openSales.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Tahsil edilen</p>
                <div className="mt-1 space-y-1">
                  {Object.entries(paidByCurrency).length
                    ? Object.entries(paidByCurrency).map(([currency, value]) => <p key={currency} className="text-lg font-semibold">{money(value, currency)}</p>)
                    : <p className="text-2xl font-semibold">0</p>}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Bekleyen taksit</p>
                <p className="mt-1 text-2xl font-semibold">{pendingInstallments.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Vadesi geçen</p>
                <p className="mt-1 text-2xl font-semibold">{overdueInstallments.length}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{sales.length} satış</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{payments.length} tahsilat</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{plans.length} ödeme planı</span>
            </div>
          </section>

          <section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-xs uppercase tracking-[.16em] text-slate-400">CRM Akış Merkezi</p>
            <h2 className="mt-2 text-2xl font-semibold">Müşteriden tahsilata tek akış</h2>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {["Müşteri", "Talep", "Eşleşme", "Gösterim", "Teklif", "Satış", "Komisyon", "Tahsilat"].map((x, i) => (
                <div key={x} className="rounded-xl bg-white/10 p-3">
                  <p className="text-[10px] text-slate-400">0{i + 1}</p>
                  <p className="text-sm font-semibold">{x}</p>
                </div>
              ))}
            </div>
            <Link href="/crm" className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
              Akış Merkezini Aç →
            </Link>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-5">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">Bugünün işleri</h2>
                <Link href="/sales" className="text-sm font-semibold">Tümü →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {openTasks.slice(0, 5).map((x) => (
                  <div key={x.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold">{x.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{x.customer?.name ?? "Genel"} · {dt(x.dueAt)} · {x.priority}</p>
                  </div>
                ))}
                {!openTasks.length && <p className="text-sm text-slate-400">Açık görev yok.</p>}
              </div>
            </div>
            <div className="rounded-3xl border bg-white p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[.16em] text-slate-400">Bugün</p>
                  <h2 className="mt-2 text-xl font-semibold">{todayShowings.length} gösterim · {openSales.length} açık satış</h2>
                </div>
                <Link href="/sales" className="text-sm font-semibold">Satış operasyonu →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {todayShowings.slice(0, 4).map((x) => (
                  <div key={x.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold">{x.customer.name}</p>
                    <p className="text-xs text-slate-500">{x.listing.code} · {dt(x.dateTime)}</p>
                  </div>
                ))}
                {!todayShowings.length && <p className="text-sm text-slate-400">Bugün planlanmış gösterim yok.</p>}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Portföy Hareketi</p>
                <h2 className="mt-1 text-xl font-semibold">Son aktif ilanlar</h2>
              </div>
              <Link href="/portfolio" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">+ İlan / Portföy</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {listings.slice(0, 6).map((x) => (
                <Link key={x.id} href="/portfolio" className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{x.code}</p>
                  <p className="mt-2 font-semibold">{x.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{money(x.price, x.currency)}</p>
                  <p className="text-xs text-slate-400">{x.property?.district ?? "—"} / {x.property?.neighborhood ?? "—"}</p>
                </Link>
              ))}
              {!listings.length && <p className="text-sm text-slate-400">Aktif portföy yok.</p>}
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-5">
              <h2 className="text-xl font-semibold">Son Hareketler</h2>
              <div className="mt-4 space-y-3">
                {activities.slice(0, 5).map((x) => (
                  <div key={x.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">{x.customer.name}</p>
                    <p className="text-sm text-slate-600">{x.summary}</p>
                    <p className="mt-1 text-xs text-slate-400">{dt(x.occurredAt)}</p>
                  </div>
                ))}
                {!activities.length && <p className="text-sm text-slate-400">Henüz aktivite yok.</p>}
              </div>
            </div>
            <div className="rounded-3xl border bg-white p-5">
              <h2 className="text-xl font-semibold">Hızlı Aksiyonlar</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["＋", "Yeni Müşteri", "/clients", "Müşteri kaydı aç"],
                  ["🏡", "Yeni Portföy", "/portfolio", "İlan / portföy ekle"],
                  ["🎯", "Eşleştirme", "/matching", "Talebe uygun portföy bul"],
                  ["💳", "Finans", "/finance", "Komisyon ve tahsilat"],
                ].map(([icon, title, href, text]) => (
                  <Link key={title} href={href} className="rounded-2xl border bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
                    <span className="text-xl">{icon}</span>
                    <p className="mt-3 font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">{text}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
