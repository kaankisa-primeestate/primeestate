"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

type Task = {
  id: string;
  title: string;
  dueAt: string;
  priority: string;
  status: string;
  customer: { id: string; name: string } | null;
};

type Showing = {
  id: string;
  dateTime: string;
  status: string;
  note: string | null;
  customer: { id: string; name: string };
  listing: { id: string; code: string; title: string; property?: { district: string; neighborhood: string } };
};

type Customer = {
  id: string;
  name: string;
  nextAction: string | null;
  nextActionAt: string | null;
};

type CalendarEvent = {
  id: string;
  kind: "task" | "showing" | "followup";
  title: string;
  date: Date;
  customerId?: string;
  customerName?: string;
  meta?: string;
  status?: string;
};

type ViewMode = "day" | "week";

const kindStyle: Record<CalendarEvent["kind"], string> = {
  task: "border-slate-200 bg-slate-50",
  showing: "border-blue-100 bg-blue-50",
  followup: "border-amber-100 bg-amber-50",
};
const kindLabel: Record<CalendarEvent["kind"], string> = {
  task: "Görev",
  showing: "Gösterim",
  followup: "Takip",
};

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function formatTime(date: Date) {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function sameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}
function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function getWeekDays(selectedDate: Date) {
  const monday = startOfDay(selectedDate);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<ViewMode>("day");
  const [kindFilter, setKindFilter] = useState<"ALL" | CalendarEvent["kind"]>("ALL");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const responses = await Promise.all([
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/showings", { cache: "no-store" }),
          fetch("/api/customers", { cache: "no-store" }),
        ]);
        const payloads = await Promise.all(responses.map((response) => response.json()));
        const [taskResponse, showingResponse, customerResponse] = responses;
        const [taskPayload, showingPayload, customerPayload] = payloads;
        if (!taskResponse.ok) throw new Error(taskPayload.message ?? "Görevler alınamadı.");
        if (!showingResponse.ok) throw new Error(showingPayload.message ?? "Gösterimler alınamadı.");
        if (!customerResponse.ok) throw new Error(customerPayload.message ?? "Müşteriler alınamadı.");
        if (!cancelled) {
          setTasks(taskPayload.tasks ?? []);
          setShowings(showingPayload.showings ?? []);
          setCustomers(customerPayload.customers ?? []);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Takvim verileri alınamadı.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const events = useMemo<CalendarEvent[]>(() => [
    ...tasks.map((task) => ({
      id: "task-" + task.id,
      kind: "task" as const,
      title: task.title,
      date: new Date(task.dueAt),
      customerId: task.customer?.id,
      customerName: task.customer?.name,
      meta: task.customer?.name ?? "Genel görev",
      status: task.status,
    })),
    ...showings.map((showing) => ({
      id: "showing-" + showing.id,
      kind: "showing" as const,
      title: showing.listing.title,
      date: new Date(showing.dateTime),
      customerId: showing.customer.id,
      customerName: showing.customer.name,
      meta: showing.listing.property
        ? showing.listing.property.district + " / " + showing.listing.property.neighborhood
        : showing.listing.code,
      status: showing.status,
    })),
    ...customers.filter((customer) => customer.nextActionAt && customer.nextAction).map((customer) => ({
      id: "followup-" + customer.id,
      kind: "followup" as const,
      title: customer.nextAction as string,
      date: new Date(customer.nextActionAt as string),
      customerId: customer.id,
      customerName: customer.name,
      meta: "Müşteri takibi",
    })),
  ].filter((event) => !Number.isNaN(event.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime()), [customers, showings, tasks]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return events.filter((event) => {
      const matchesKind = kindFilter === "ALL" || event.kind === kindFilter;
      const matchesQuery = !normalizedQuery || [event.title, event.customerName ?? "", event.meta ?? ""]
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery));
      return matchesKind && matchesQuery;
    });
  }, [events, kindFilter, query]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const selectedEvents = filteredEvents.filter((event) => sameDay(event.date, selectedDate));
  const counts = useMemo(() => ({
    today: filteredEvents.filter((event) => sameDay(event.date, new Date())).length,
    tasks: filteredEvents.filter((event) => event.kind === "task").length,
    showings: filteredEvents.filter((event) => event.kind === "showing").length,
    followups: filteredEvents.filter((event) => event.kind === "followup").length,
  }), [filteredEvents]);

  function moveDay(amount: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return startOfDay(next);
    });
  }

  function moveWeek(amount: number) {
    moveDay(amount * 7);
  }

  function selectDate(value: string) {
    if (!value) return;
    const parsed = new Date(value + "T00:00:00");
    if (!Number.isNaN(parsed.getTime())) setSelectedDate(startOfDay(parsed));
  }

  function eventHref(event: CalendarEvent) {
    if (event.customerId) return "/clients/" + event.customerId;
    return "/sales";
  }

  function EventCard({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
    return (
      <article className={"rounded-2xl border p-3 " + kindStyle[event.kind]}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-center shadow-sm">
            <p className={compact ? "text-sm font-bold text-slate-900" : "text-base font-bold text-slate-900"}>{formatTime(event.date)}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{kindLabel[event.kind]}</p>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-950">{event.title}</h3>
            {event.customerName && <Link href={"/clients/" + event.customerId} className="mt-1 block truncate text-sm text-slate-600 hover:underline">{event.customerName}</Link>}
            <p className="mt-1 truncate text-xs text-slate-400">{event.meta}</p>
            {event.status && <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{event.status}</span>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={eventHref(event)} className="text-xs font-semibold text-slate-600 hover:underline">
            {event.customerId ? "Müşteriyi aç" : "İş akışını aç"} →
          </Link>
          {event.kind === "task" && <Link href="/sales/task/new" className="text-xs font-semibold text-slate-600 hover:underline">Yeni görev</Link>}
          {event.kind === "showing" && <Link href="/sales/showing/new" className="text-xs font-semibold text-slate-600 hover:underline">Yeni gösterim</Link>}
        </div>
      </article>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Takvim</p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Takvim</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Görevler, gösterimler ve müşteri takip tarihleri tek çalışma ekranında.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/sales/activity/new" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">+ Aktivite</Link>
                <Link href="/sales/task/new" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">+ Görev</Link>
                <Link href="/sales/showing/new" className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm">+ Gösterim</Link>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Bugünkü kayıt", counts.today, "Tüm kaynaklar"],
              ["Görev", counts.tasks, "CRM görevleri"],
              ["Gösterim", counts.showings, "Planlı + geçmiş"],
              ["Takip", counts.followups, "Müşteri aksiyonları"],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                <p className="mt-1 hidden text-xs text-slate-400 sm:block">{hint}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSelectedDate(startOfDay(new Date()))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Bugün</button>
                <button type="button" onClick={() => view === "day" ? moveDay(-1) : moveWeek(-1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">←</button>
                <button type="button" onClick={() => view === "day" ? moveDay(1) : moveWeek(1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">→</button>
                <input aria-label="Takvim tarihi" type="date" value={dayKey(selectedDate)} onChange={(e) => selectDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setView("day")} className={"rounded-xl px-3 py-2 text-sm font-semibold " + (view === "day" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600")}>Gün</button>
                <button type="button" onClick={() => setView("week")} className={"rounded-xl px-3 py-2 text-sm font-semibold " + (view === "week" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600")}>Hafta</button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Müşteri, görev, gösterim veya takip ara…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                <option value="ALL">Tüm kayıtlar</option>
                <option value="task">Görevler</option>
                <option value="showing">Gösterimler</option>
                <option value="followup">Takipler</option>
              </select>
              <button type="button" onClick={() => { setQuery(""); setKindFilter("ALL"); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600">Temizle</button>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {view === "day" ? selectedDate.toLocaleDateString("tr-TR", { weekday: "long" }) : "Haftalık görünüm"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {view === "day"
                  ? selectedDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                  : weekDays[0].toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) + " – " + weekDays[6].toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
              </h2>
            </div>
          </section>

          {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
          {loading && <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Takvim yükleniyor…</div>}

          {!loading && !error && view === "day" && (
            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Günlük ajanda</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedEvents.length ? selectedEvents.length + " kayıt" : "Kayıt yok"}</h2>
                </div>
                <Link href="/sales" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">İş Akışı</Link>
              </div>
              <div className="mt-5 space-y-3">
                {!selectedEvents.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Bu gün için eşleşen kayıt bulunmuyor.</div>}
                {selectedEvents.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          )}

          {!loading && !error && view === "week" && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid min-w-[980px] grid-cols-7 divide-x divide-slate-200">
                {weekDays.map((date) => {
                  const dayEvents = filteredEvents.filter((event) => sameDay(event.date, date));
                  const active = sameDay(date, selectedDate);
                  return (
                    <div key={dayKey(date)} className="min-h-[430px]">
                      <button type="button" onClick={() => { setSelectedDate(startOfDay(date)); setView("day"); }} className={"w-full border-b border-slate-200 p-3 text-left " + (active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700")}>
                        <span className="block text-[10px] font-semibold uppercase">{date.toLocaleDateString("tr-TR", { weekday: "short" })}</span>
                        <span className="mt-1 block text-lg font-bold">{date.getDate()}</span>
                        <span className={"mt-1 block text-xs " + (active ? "text-slate-300" : "text-slate-400")}>{dayEvents.length} kayıt</span>
                      </button>
                      <div className="space-y-2 p-2">
                        {dayEvents.length === 0 && <p className="p-3 text-center text-xs text-slate-400">—</p>}
                        {dayEvents.map((event) => <EventCard key={event.id} event={event} compact />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Entegrasyon</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Google Takvim bağlantısı sonraki entegrasyon katmanı</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">PrimeEstate takvimindeki görev ve gösterimler artık tek çalışma ekranında. Google hesabı bağlantısı için OAuth ve kullanıcı bazlı token saklama ayrıca ele alınacak; mevcut ekranda henüz Google etkinlikleri okunmuyor.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
