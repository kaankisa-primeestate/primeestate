"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type T = { id: string; title: string; dueAt: string; priority: string; status: string; customer: { name: string } | null };
type L = { id: string; code: string; title: string; price: string | number; currency: string; property?: { district?: string; neighborhood?: string } };
type A = { id: string; occurredAt: string; summary: string; customer: { name: string } };
type S = { id: string; dateTime: string; customer: { name: string }; listing: { code: string; title: string } };
type C = { id: string; name: string };
type O = { id: string; status: string };
type Sale = { id: string; status: string; amount: string | number; currency: string };
type Payment = { id: string; saleId: string; amount: string | number; currency: string; status: string };
type Plan = { id: string; installments: { id: string; amount: string | number; currency: string; dueAt: string; status: string }[] };

async function g<T>(u: string): Promise<T> {
  const r = await fetch(u, { cache: "no-store" });
  const text = await r.text();
  let d: unknown = null;

  if (text.trim()) {
    try {
      d = JSON.parse(text);
    } catch {
      throw new Error(`Dashboard API yanıtı geçersiz: ${u} (${r.status})`);
    }
  }

  if (!r.ok) {
    const message =
      d && typeof d === "object" && "message" in d && typeof d.message === "string"
        ? d.message
        : `API ${r.status} yanıtı`;
    throw new Error(`${message} — ${u}`);
  }

  if (!d || typeof d !== "object") {
    throw new Error(`Dashboard API boş yanıt döndürdü: ${u}`);
  }

  return d as T;
}

const dt = (v: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
const money = (v: string | number, c = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency: c }).format(Number(v));

export default function DashboardLive() {
  const [c, setC] = useState<C[]>([]);
  const [t, setT] = useState<T[]>([]);
  const [l, setL] = useState<L[]>([]);
  const [a, setA] = useState<A[]>([]);
  const [s, setS] = useState<S[]>([]);
  const [o, setO] = useState<O[]>([]);
  const [sale, setSale] = useState<Sale[]>([]);
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
    const [x, y, z, q, w, n, m, p, pp] = results;
    const failed = results
      .map((result, index) => (result.status === "rejected" ? { index, reason: result.reason } : null))
      .filter((item): item is { index: number; reason: unknown } => item !== null);

    setC(x.status === "fulfilled" ? x.value.customers : []);
    setT(y.status === "fulfilled" ? y.value.tasks : []);
    setL(z.status === "fulfilled" ? z.value.listings : []);
    setA(q.status === "fulfilled" ? q.value.activities : []);
    setS(w.status === "fulfilled" ? w.value.showings : []);
    setO(n.status === "fulfilled" ? n.value.offers : []);
    setSale(m.status === "fulfilled" ? m.value.sales : []);
    setPayments(p.status === "fulfilled" ? p.value.payments : []);
    setPlans(pp.status === "fulfilled" ? pp.value.plans : []);
    setLastUpdated(new Date());

    if (failed.length) {
      const first = failed[0].reason;
      setErr(first instanceof Error
        ? `Dashboard verilerinin bir kısmı alınamadı. ${first.message}`
        : "Dashboard verilerinin bir kısmı alınamadı. Sayfa otomatik olarak tekrar denenecek.");
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

  const openT = t.filter((x) => x.status !== "TAMAMLANDI");
  const openO = o.filter((x) => !["KABUL", "REDDEDILDI"].includes(x.status));
  const activeListings = l.filter((x) => (x as L & { status?: string }).status === undefined || (x as L & { status?: string }).status === "AKTIF");
  const paidByCurrency = payments.filter((payment) => payment.status === "ODENDI").reduce<Record<string, number>>((acc, payment) => {
    acc[payment.currency] = (acc[payment.currency] ?? 0) + Number(payment.amount);
    return acc;
  }, {});
  const pendingInstallments = plans.flatMap((plan) => plan.installments).filter((item) => item.status === "BEKLIYOR");
  const overdueInstallments = pendingInstallments.filter((item) => Date.parse(item.dueAt) < Date.now());
  const today = new Date().toDateString();
  const todayS = s.filter((x) => new Date(x.dateTime).toDateString() === today);

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
              {lastUpdated && <span className="hidden text-xs text-slate-400 sm:inline">Son güncelleme {lastUpdated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>}
              <button onClick={() => void load()} disabled={busy} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Yükleniyor…" : "↻ Yenile"}</button>
            </div>
          </header>

          {err && <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{err}</div>}

          <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Hızlı Aksiyonlar</p>
              <h2 className="mt-1 text-xl font-semibold">Bugün ne yapmak istiyorsun?</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["＋", "Yeni Müşteri", "/clients", "Müşteri kaydı aç"],
                ["🏡", "Yeni Portföy", "/portfolio", "İlan / portföy ekle"],
                ["🎯", "Eşleştirme", "/matching", "Talebe uygun portföy bul"],
                ["🧭", "Akış Merkezi", "/crm", "Satış sürecini takip et"],
              ].map(([icon, title, href, text]) => (
                <Link key={title} href={href} className="rounded-2xl border bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
                  <span className="text-xl">{icon}</span>
                  <p className="mt-3 font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{text}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["👥", "Müşteriler", c.length, "/relationships"],
              ["🏡", "Aktif Portföy", activeListings.length, "/portfolio"],
              ["🔥", "Açık Fırsat", openO.length, "/sales"],
              ["💼", "Açık Satış", sale.filter((x) => x.status === "ACIK").length, "/finance"],
            ].map(([e, n, v, h]) => (
              <Link key={String(n)} href={String(h)} className="rounded-2xl border bg-white p-5 shadow-sm">
                <span className="text-2xl">{e}</span>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">{n}</p>
                <p className="mt-1 text-3xl font-bold">{busy ? "—" : v}</p>
              </Link>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Finans Özeti</p>
                <h2 className="mt-1 text-xl font-semibold">Satıştan tahsilata canlı görünüm</h2>
              </div>
              <Link href="/finance" className="text-sm font-semibold">Finans →</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Açık satış</p><p className="mt-1 text-2xl font-semibold">{sale.filter((x) => x.status === "ACIK").length}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Tahsil edilen</p><div className="mt-1 space-y-1">{Object.entries(paidByCurrency).length ? Object.entries(paidByCurrency).map(([currency, value]) => <p key={currency} className="text-lg font-semibold">{money(value, currency)}</p>) : <p className="text-2xl font-semibold">0</p>}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Bekleyen taksit</p><p className="mt-1 text-2xl font-semibold">{pendingInstallments.length}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Vadesi geçen</p><p className="mt-1 text-2xl font-semibold">{overdueInstallments.length}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5">{payments.length} tahsilat</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{plans.length} ödeme planı</span></div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-xs uppercase tracking-[.16em] text-slate-400">CRM Akış Merkezi</p>
              <h2 className="mt-2 text-2xl font-semibold">Müşteriden tahsilata tek akış</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["Müşteri", "Talep", "Eşleşme", "Gösterim", "Teklif", "Satış", "Komisyon", "Tahsilat"].map((x, i) => (
                  <div key={x} className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] text-slate-400">0{i + 1}</p>
                    <p className="text-sm font-semibold">{x}</p>
                  </div>
                ))}
              </div>
              <Link href="/crm" className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">Akış Merkezini Aç →</Link>
            </div>
            <div className="rounded-3xl border bg-white p-6">
              <p className="text-xs uppercase tracking-[.16em] text-slate-400">Bugün</p>
              <h2 className="mt-2 text-xl font-semibold">{todayS.length} gösterim · {sale.filter((x) => x.status === "ACIK").length} açık satış</h2>
              <div className="mt-4 space-y-2">
                {todayS.slice(0, 4).map((x) => (
                  <div key={x.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold">{x.customer.name}</p>
                    <p className="text-xs text-slate-500">{x.listing.code} · {dt(x.dateTime)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-5">
              <div className="flex justify-between"><h2 className="text-xl font-semibold">Bugünün işleri</h2><Link href="/sales" className="text-sm font-semibold">Tümü →</Link></div>
              <div className="mt-4 space-y-3">{openT.slice(0, 5).map((x) => <div key={x.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold">{x.title}</p><p className="mt-1 text-xs text-slate-500">{x.customer?.name ?? "Genel"} · {dt(x.dueAt)} · {x.priority}</p></div>)}</div>
            </div>
            <div className="rounded-3xl border bg-white p-5">
              <h2 className="text-xl font-semibold">Son Hareketler</h2>
              <div className="mt-4 space-y-3">{a.slice(0, 5).map((x) => <div key={x.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold">{x.customer.name}</p><p className="text-sm text-slate-600">{x.summary}</p><p className="mt-1 text-xs text-slate-400">{dt(x.occurredAt)}</p></div>)}</div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5">
            <div className="flex justify-between">
              <div><p className="text-xs uppercase tracking-wide text-slate-400">Portföy Hareketi</p><h2 className="mt-1 text-xl font-semibold">Son aktif ilanlar</h2></div>
              <Link href="/portfolio" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">+ İlan / Portföy</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {l.slice(0, 6).map((x) => <Link key={x.id} href="/portfolio" className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{x.code}</p><p className="mt-2 font-semibold">{x.title}</p><p className="mt-1 text-sm text-slate-500">{money(x.price, x.currency)}</p><p className="text-xs text-slate-400">{x.property?.district ?? "—"} / {x.property?.neighborhood ?? "—"}</p></Link>)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
