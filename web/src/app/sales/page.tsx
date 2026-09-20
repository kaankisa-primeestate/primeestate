"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { salesOps } from "@/data/salesOps";
import type { ActivityType, OfferStatus, ShowingStatus, TaskStatus } from "@/types/SalesOps";

const tabs = ["Bugün", "Aktiviteler", "Görevler", "Gösterimler", "Teklifler"] as const;
type Tab = (typeof tabs)[number];

const activityIcon: Record<ActivityType, string> = { Arama: "☎", WhatsApp: "◈", "E-posta": "✉", Not: "▤", Gösterim: "⌂", Teklif: "₺" };
const taskTone: Record<TaskStatus, string> = { Bekliyor: "bg-slate-100 text-slate-600", Tamamlandı: "bg-emerald-50 text-emerald-700", Gecikti: "bg-rose-50 text-rose-700" };
const showingTone: Record<ShowingStatus, string> = { Planlandı: "bg-blue-50 text-blue-700", Gerçekleşti: "bg-emerald-50 text-emerald-700", İptal: "bg-rose-50 text-rose-700" };
const offerTone: Record<OfferStatus, string> = { Taslak: "bg-slate-100 text-slate-600", Sunuldu: "bg-blue-50 text-blue-700", "Karşı teklif": "bg-amber-50 text-amber-700", Kabul: "bg-emerald-50 text-emerald-700", Reddedildi: "bg-rose-50 text-rose-700" };
const activityTypeLabel: Record<string, ActivityType> = { ARAMA: "Arama", WHATSAPP: "WhatsApp", EMAIL: "E-posta", NOT: "Not", GOSTERIM: "Gösterim", TEKLIF: "Teklif" };

function Pill({ children, tone = "bg-slate-100 text-slate-600" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{children}</span>;
}

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>("Bugün");
  const [taskState, setTaskState] = useState<Record<number, TaskStatus>>({});
  const [tasks, setTasks] = useState(salesOps.tasks);
  const [showings, setShowings] = useState(salesOps.showings);
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsError, setOpsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOps() {
      try {
        const [taskResponse, showingResponse] = await Promise.all([
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/showings", { cache: "no-store" }),
        ]);
        const [taskPayload, showingPayload] = await Promise.all([taskResponse.json(), showingResponse.json()]);
        if (!taskResponse.ok) throw new Error(taskPayload.message ?? "Görevler alınamadı.");
        if (!showingResponse.ok) throw new Error(showingPayload.message ?? "Gösterimler alınamadı.");
        if (!cancelled) {
          setTasks(taskPayload.tasks ?? []);
          setShowings(showingPayload.showings ?? []);
        }
      } catch (error) {
        if (!cancelled) setOpsError(error instanceof Error ? error.message : "İş akışı verileri alınamadı.");
      } finally {
        if (!cancelled) setOpsLoading(false);
      }
    }
    void loadOps();
    return () => { cancelled = true; };
  }, []);
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    occurredAt: string;
    summary: string;
    outcome: string | null;
    customer: { id: string; name: string };
    listing: { id: string; code: string; title: string } | null;
    owner: { id: string; name: string };
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      setActivitiesLoading(true);
      setActivitiesError(null);
      try {
        const response = await fetch("/api/activities?limit=50", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Aktiviteler alınamadı.");
        if (!cancelled) setActivities(payload.activities ?? []);
      } catch (error) {
        if (!cancelled) setActivitiesError(error instanceof Error ? error.message : "Aktiviteler alınamadı.");
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    }
    void loadActivities();
    return () => { cancelled = true; };
  }, []);
  const taskRows = useMemo(() => tasks.map((task) => ({ ...task, status: taskState[task.id] ?? task.status })), [tasks, taskState]);
  const pendingTasks = taskRows.filter((t) => t.status !== "Tamamlandı").length;
  const plannedShowings = showings.filter((s) => s.status === "Planlandı").length;
  const openOffers = salesOps.offers.filter((o) => !["Kabul", "Reddedildi"].includes(o.status)).length;
  const todayActivityCount = activities.filter((activity) => {
    const date = new Date(activity.occurredAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length;

  return <div className="min-h-screen bg-slate-50 md:flex">
    <Sidebar />
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Sales Ops</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">İş Akışı</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Eşleşmeyi aksiyona çevir. Aktivite, görev, gösterim ve teklif aynı müşteri–portföy ilişkisi üzerinde ilerler.</p></div>
            <button type="button" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Hızlı Aksiyon</button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "Bekleyen görev", value: pendingTasks, hint: "bugün ve geciken" }, { label: "Planlı gösterim", value: plannedShowings, hint: "müşteri + portföy bağlı" }, { label: "Açık teklif", value: openOffers, hint: "takip gerekiyor" }, { label: "Bugünkü aktivite", value: todayActivityCount, hint: "kayıtlı temas" }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{item.label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.hint}</p></div>)}
        </section>

        <nav className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === item ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{item}</button>)}
        </nav>

        {tab === "Bugün" && <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bugünün çalışma sırası</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Önce bunlar</h2></div><Pill>Önceliklendirilmiş</Pill></div><div className="mt-5 space-y-3">{tasks.filter((t) => t.status !== "Tamamlandı").slice(0, 4).map((task) => <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={task.priority === "Yüksek" ? "bg-amber-50 text-amber-700" : "bg-white text-slate-500 ring-1 ring-slate-200"}>{task.priority}</Pill><span className="text-xs text-slate-400">{task.due}</span></div><p className="mt-2 font-semibold text-slate-900">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.customerName} · {task.source}</p></div><button type="button" onClick={() => setTaskState((current) => ({ ...current, [task.id]: "Tamamlandı" }))} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Tamamla</button></div>)}</div></section>
          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime akış özeti · V1</p><h2 className="mt-2 text-2xl font-semibold">Eşleşmeden kapanışa</h2><div className="mt-6 space-y-3">{[["01", "Aktivite", "Müşteriyle temas kayda girer"],["02", "Görev", "Sonraki aksiyon unutulmaz"],["03", "Gösterim", "Müşteri + portföy aynı kayıtta"],["04", "Teklif", "Fiyat ve durum takip edilir"]].map(([no,title,desc]) => <div key={no} className="flex gap-3 rounded-2xl bg-white/10 p-3"><span className="text-xs font-bold text-slate-400">{no}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-slate-400">{desc}</p></div></div>)}</div><p className="mt-6 text-xs leading-5 text-slate-400">V1 seed verisi kullanır. Kalıcı kayıt, yetki ve API bağlantısı foundation aşamasında bu domainlere bağlanacaktır.</p></section>
        </div>}

        {tab === "Aktiviteler" && <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Timeline</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Son aktiviteler</h2></div><button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">+ Aktivite</button></div><div className="mt-5 divide-y divide-slate-100">
          {activitiesLoading && <p className="py-8 text-center text-sm text-slate-400">Aktiviteler yükleniyor…</p>}
          {activitiesError && <p className="py-8 text-center text-sm text-rose-600">{activitiesError}</p>}
          {!activitiesLoading && !activitiesError && activities.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Henüz kayıtlı aktivite yok.</p>}
          {!activitiesLoading && !activitiesError && activities.map((item) => <article key={item.id} className="flex gap-4 py-4 first:pt-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{activityIcon[activityTypeLabel[item.type] ?? "Not"]}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{item.customer.name}</span><Pill>{activityTypeLabel[item.type] ?? item.type}</Pill><span className="text-xs text-slate-400">{new Date(item.occurredAt).toLocaleString("tr-TR")}</span></div>
              <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
              <p className="mt-1 text-xs text-slate-400">Sonuç: {item.outcome ?? "—"}{item.listing ? ` · ${item.listing.title}` : ""} · {item.owner.name}</p>
            </div>
          </article>)}
        </div></section>}

        {tab === "Görevler" && <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Takip</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Görev kuyruğu</h2></div><button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">+ Görev</button></div><div className="mt-5 space-y-3">{tasks.map((task) => <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={taskTone[task.status]}>{task.status}</Pill><Pill tone={task.priority === "Yüksek" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}>{task.priority}</Pill><span className="text-xs text-slate-400">{task.due}</span></div><p className="mt-2 font-semibold text-slate-900">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.customerName} · {task.source}</p></div>{task.status !== "Tamamlandı" && <button type="button" onClick={() => setTaskState((current) => ({ ...current, [task.id]: "Tamamlandı" }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tamamlandı işaretle</button>}</div>)}</div></section>}

        {tab === "Gösterimler" && <section className="mt-5 grid gap-4 md:grid-cols-2">{salesOps.showings.map((item) => <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><Pill tone={showingTone[item.status]}>{item.status}</Pill><span className="text-xs font-semibold text-slate-400">{item.date} · {item.time}</span></div><h2 className="mt-4 text-lg font-semibold text-slate-950">{item.customerName}</h2><p className="mt-1 text-sm text-slate-600">{item.portfolioTitle}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Katılımcı</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.attendees} kişi</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Bağlantı</p><p className="mt-1 text-sm font-semibold text-slate-800">PR-{String(2400 + item.portfolioId).slice(-4)}</p></div></div>{item.note && <p className="mt-4 text-sm leading-6 text-slate-500">{item.note}</p>}<button type="button" className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Gösterim detayına git</button></article>)}</section>}

        {tab === "Teklifler" && <section className="mt-5 space-y-4">{salesOps.offers.map((item) => <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={offerTone[item.status]}>{item.status}</Pill><span className="text-xs text-slate-400">{item.date}</span></div><h2 className="mt-2 text-lg font-semibold text-slate-950">{item.customerName} → {item.portfolioTitle}</h2><p className="mt-1 text-sm text-slate-500">Teklif tutarı</p><p className="mt-1 text-2xl font-semibold text-slate-950">{item.amountLabel}</p></div><div className="rounded-2xl bg-slate-50 p-4 lg:min-w-56"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.nextAction}</p><button type="button" className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Aksiyonu aç</button></div></div></article>)}</section>}
      </div>
    </main>
  </div>;
}
