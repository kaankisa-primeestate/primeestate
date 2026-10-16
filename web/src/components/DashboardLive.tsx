"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PrimeBriefLive from "@/components/PrimeBriefLive";

type T = { id: string; title: string; dueAt: string; priority: string; status: string; customer: { name: string } | null };
type L = { id: string; code: string; title: string; price: string | number; currency: string; status: string; property?: { district?: string; neighborhood?: string } };
type A = { id: string; occurredAt: string; summary: string; customer: { name: string } };
type S = { id: string; dateTime: string; customer: { name: string }; listing: { code: string; title: string } };
type C = { id: string; name: string };
type O = { id: string; status: string };
type FinanceSummary = { openSales: number; paidByCurrency: Record<string, string>; officeCollectedByCurrency: Record<string, string>; consultantCollectedByCurrency: Record<string, string>; paymentCount: number; consultantFeeSummary: { count: number; paid: number; pending: number; overdue: number; totals: Record<string, number>; paidTotals: Record<string, number> } | null };

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
      d &&
      typeof d === "object" &&
      "error" in d &&
      d.error &&
      typeof d.error === "object" &&
      "message" in d.error &&
      typeof d.error.message === "string"
        ? d.error.message
        : d && typeof d === "object" && "message" in d && typeof d.message === "string"
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
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dashboardQuery, setDashboardQuery] = useState("");
  const [dashboardRange, setDashboardRange] = useState<"TODAY" | "WEEK" | "ALL">("TODAY");
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadInFlight = useRef(false);

  async function load() {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    setBusy(true);
    setErr("");

    const requests = [
      g<{ customers: C[] }>("/api/customers"),
      g<{ tasks: T[] }>("/api/tasks?limit=50"),
      g<{ listings: L[] }>("/api/listings?status=AKTIF"),
      g<{ activities: A[] }>("/api/activities?limit=20"),
      g<{ showings: S[] }>("/api/showings"),
      g<{ offers: O[] }>("/api/offers"),
      g<FinanceSummary>("/api/dashboard/finance-summary"),
    ] as const;

    const results = await Promise.allSettled(requests);
    const [x, y, z, q, w, n, f] = results;
    const failed = results
      .map((result, index) => (result.status === "rejected" ? { index, reason: result.reason } : null))
      .filter((item): item is { index: number; reason: unknown } => item !== null);

    if (x.status === "fulfilled") setC(x.value.customers);
    if (y.status === "fulfilled") setT(y.value.tasks);
    if (z.status === "fulfilled") setL(z.value.listings);
    if (q.status === "fulfilled") setA(q.value.activities);
    if (w.status === "fulfilled") setS(w.value.showings);
    if (n.status === "fulfilled") setO(n.value.offers);
    if (f.status === "fulfilled") setFinance(f.value);

    const hasSuccessfulRequest = failed.length < results.length;
    if (hasSuccessfulRequest) setLastUpdated(new Date());
    setHasLoaded(true);

    if (failed.length) {
      const first = failed[0].reason;
      setErr(first instanceof Error
        ? `Dashboard verilerinin bir kısmı alınamadı. ${first.message}`
        : "Dashboard verilerinin bir kısmı alınamadı. Sayfa otomatik olarak tekrar denenecek.");
    }
    setBusy(false);
    loadInFlight.current = false;
  }

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    const handleVisibilityChange = () => {
      if (!document.hidden) void load();
    };
    const handleFocus = () => void load();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const normalizedQuery = dashboardQuery.trim().toLocaleLowerCase("tr-TR");
  const rangeStart = (() => {
    if (dashboardRange === "ALL") return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (dashboardRange === "WEEK") start.setDate(start.getDate() - 6);
    return start;
  })();
  const inRange = (value: string) => !rangeStart || new Date(value) >= rangeStart;
  const matchesQuery = (value: string) => !normalizedQuery || value.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
  const openT = t.filter((x) => x.status !== "TAMAMLANDI" && inRange(x.dueAt) && matchesQuery(`${x.title} ${x.customer?.name ?? ""}`));
  const openO = o.filter((x) => !["KABUL", "REDDEDILDI"].includes(x.status));
  const activeListings = l.filter((x) => x.status === "AKTIF");
  const financeLoaded = finance !== null;
  const paidByCurrency = finance?.paidByCurrency ?? {};
  const officeCollectedByCurrency = finance?.officeCollectedByCurrency ?? {};
  const consultantCollectedByCurrency = finance?.consultantCollectedByCurrency ?? {};
  const formatCurrencyMap = (values: Record<string, string>) => Object.entries(values).map(([currency, value]) => money(value, currency));
  const todayS = s.filter((x) => inRange(x.dateTime) && matchesQuery(`${x.customer.name} ${x.listing.code} ${x.listing.title}`));
  const recentActivities = a.filter((x) => inRange(x.occurredAt) && matchesQuery(`${x.customer.name} ${x.summary}`));

  return (
    <div className="min-h-screen bg-[#f7f8fa] md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 xl:px-10">
          <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">PrimeEstate / Çalışma alanı</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Bugün</h1>
              <p className="mt-1 text-sm text-slate-500">İlişkilerini, önceliklerini ve fırsatlarını tek yerden yönet.</p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && <span className="hidden text-xs text-slate-400 lg:inline">Son güncelleme {lastUpdated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>}
              <button onClick={() => void load()} disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50">{busy ? "Yenileniyor…" : "↻ Yenile"}</button>
            </div>
          </header>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="dashboard-search">Dashboard ara</label>
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input id="dashboard-search" value={dashboardQuery} onChange={(event) => setDashboardQuery(event.target.value)} placeholder="İsim, görev, gösterim veya aktivite ara…" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
            </div>
            <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {[
                ["TODAY", "Bugün"],
                ["WEEK", "7 gün"],
                ["ALL", "Tümü"],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setDashboardRange(value as "TODAY" | "WEEK" | "ALL")} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${dashboardRange === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{label}</button>
              ))}
            </div>
          </div>

          {err && <div role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}

          <section aria-label="Hızlı işlemler" className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Hızlı erişim</span>
            {[
              ["＋", "Müşteri ekle", "/clients"],
              ["↗", "Portföy ekle", "/portfolio"],
              ["⌕", "Eşleştirme", "/matching"],
              ["＋", "Görüşme planla", "/calendar"],
            ].map(([icon, label, href]) => (
              <Link key={label} href={href} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                <span className="text-base text-slate-400">{icon}</span>{label}
              </Link>
            ))}
          </section>

          <section aria-label="Genel durum" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "İlişkiler", value: c.length, href: "/relationships", hint: "Kayıtlı müşteri ilişkileri", mark: "01" },
              { label: "Aktif portföy", value: activeListings.length, href: "/portfolio", hint: "Yayındaki portföyler", mark: "02" },
              { label: "Açık fırsat", value: openO.length, href: "/sales", hint: "Takipteki teklifler", mark: "03" },
              { label: "Açık satış", value: finance?.openSales ?? 0, href: "/finance", hint: "Süreçteki satışlar", mark: "04" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="group rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <span className="text-[10px] font-semibold tracking-widest text-slate-300">{item.mark}</span>
                </div>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{(!hasLoaded && busy) || (item.label === "Açık satış" && !financeLoaded) ? "—" : item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
              </Link>
            ))}
          </section>

          <div className="mt-6 grid items-start gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
            <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">İlişkiler</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Takip etmen gerekenler</h2>
                </div>
                <Link href="/relationships" className="shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-950">Tüm ilişkiler ↗</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentActivities.slice(0, 5).map((item) => (
                  <Link key={item.id} href="/relationships" className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50">
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{item.customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{item.customer.name}</span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">{item.summary}</span>
                      <span className="mt-1 block text-xs text-slate-400">{dt(item.occurredAt)}</span>
                    </span>
                    <span aria-hidden="true" className="pt-1 text-slate-300">↗</span>
                  </Link>
                ))}
                {recentActivities.length === 0 && <div className="px-5 py-8 text-sm text-slate-500">Bu dönem için hareket bulunamadı.</div>}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Öncelikler</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Bugünün işleri</h2>
                </div>
                <Link href="/sales" className="shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-950">Tüm işler ↗</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {openT.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.customer?.name ?? "Genel görev"}</p>
                      <p className="mt-1 text-xs text-slate-400">{dt(item.dueAt)} · {item.priority}</p>
                    </div>
                  </div>
                ))}
                {openT.length === 0 && <div className="px-5 py-8 text-sm text-slate-500">Seçili dönemde açık görev bulunmuyor.</div>}
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Portföy</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Son aktif ilanlar</h2>
              </div>
              <Link href="/portfolio" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700">Portföyü aç <span className="ml-2">↗</span></Link>
            </div>
            <div className="grid gap-0 border-t border-slate-100 md:grid-cols-2 xl:grid-cols-3">
              {activeListings.slice(0, 3).map((item, index) => (
                <Link key={item.id} href="/portfolio" className={`min-w-0 p-5 transition hover:bg-slate-50 ${index > 0 ? "border-t border-slate-100 md:border-l xl:border-t-0" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-wide text-slate-400">{item.code}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Aktif</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{item.title}</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{money(item.price, item.currency)}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{item.property?.district ?? "—"} · {item.property?.neighborhood ?? "—"}</p>
                </Link>
              ))}
              {activeListings.length === 0 && <div className="p-5 text-sm text-slate-500">Aktif portföy bulunmuyor. Yeni portföy ekleyerek başlayabilirsin.</div>}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Prime Brain ve işletme özeti</span>
                  <span className="mt-1 block text-xs text-slate-500">Günlük yapay zekâ önerileri, finans ve aidat detayları</span>
                </span>
                <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Detayları aç ＋</span>
              </summary>
              <div className="border-t border-slate-100 p-4 sm:p-5">
                <PrimeBriefLive />
                <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Finans</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">Tahsilat özeti</h2>
                    </div>
                    <Link href="/finance" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Finansa git ↗</Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Açık satış</p><p className="mt-2 text-xl font-semibold">{financeLoaded ? finance.openSales : "—"}</p></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Tahsil edilen</p><div className="mt-2 space-y-1">{financeLoaded ? (Object.entries(paidByCurrency).length ? Object.entries(paidByCurrency).map(([currency, value]) => <p key={currency} className="text-base font-semibold">{money(value, currency)}</p>) : <p className="text-base font-semibold">0</p>) : <p className="text-base font-semibold">—</p>}</div></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Ofis payı tahsilatı</p><div className="mt-2 space-y-1">{financeLoaded ? (formatCurrencyMap(officeCollectedByCurrency).length ? formatCurrencyMap(officeCollectedByCurrency).map((value) => <p key={value} className="text-base font-semibold">{value}</p>) : <p className="text-base font-semibold">0</p>) : <p className="text-base font-semibold">—</p>}</div></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Danışman payı tahsilatı</p><div className="mt-2 space-y-1">{financeLoaded ? (formatCurrencyMap(consultantCollectedByCurrency).length ? formatCurrencyMap(consultantCollectedByCurrency).map((value) => <p key={value} className="text-base font-semibold">{value}</p>) : <p className="text-base font-semibold">0</p>) : <p className="text-base font-semibold">—</p>}</div></div>
                  </div>
                  {financeLoaded && finance.consultantFeeSummary ? <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">Danışman aidatları</p><p className="mt-1 text-xs text-slate-500">{finance.consultantFeeSummary.paid} ödendi · {finance.consultantFeeSummary.pending} bekliyor · {finance.consultantFeeSummary.overdue} gecikti</p></div><Link href="/consultant-fees" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Aidat takibi ↗</Link></div> : null}
                </section>
                <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Takvim</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Gösterimler</h2></div><Link href="/calendar" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Takvime git ↗</Link></div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {todayS.slice(0, 4).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold text-slate-800">{item.customer.name}</p><p className="mt-1 text-xs text-slate-500">{item.listing.code} · {item.listing.title}</p></div><span className="text-xs text-slate-400">{dt(item.dateTime)}</span></div>)}
                    {todayS.length === 0 && <p className="py-4 text-sm text-slate-500">Seçili dönemde gösterim bulunmuyor.</p>}
                  </div>
                </section>
              </div>
            </details>
          </section>
        </div>
      </main>
    </div>
  );
}
