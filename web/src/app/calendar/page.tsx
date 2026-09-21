"use client";

import { useEffect, useMemo, useState } from "react";
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
  customerName?: string;
  meta?: string;
  status?: string;
};

const kindStyle = {
  task: "border-slate-200 bg-slate-50",
  showing: "border-blue-100 bg-blue-50",
  followup: "border-amber-100 bg-amber-50",
};
const kindLabel = { task: "Görev", showing: "Gösterim", followup: "Takip" };

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

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
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
      customerName: task.customer?.name,
      meta: task.customer?.name ?? "Genel görev",
      status: task.status,
    })),
    ...showings.map((showing) => ({
      id: "showing-" + showing.id,
      kind: "showing" as const,
      title: showing.listing.title,
      date: new Date(showing.dateTime),
      customerName: showing.customer.name,
      meta: showing.listing.property ? showing.listing.property.district + " / " + showing.listing.property.neighborhood : showing.listing.code,
      status: showing.status,
    })),
    ...customers.filter((customer) => customer.nextActionAt && customer.nextAction).map((customer) => ({
      id: "followup-" + customer.id,
      kind: "followup" as const,
      title: customer.nextAction as string,
      date: new Date(customer.nextActionAt as string),
      customerName: customer.name,
      meta: "Müşteri takibi",
    })),
  ].filter((event) => !Number.isNaN(event.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime()), [customers, showings, tasks]);

  const selectedEvents = events.filter((event) => sameDay(event.date, selectedDate));
  const weekDays = useMemo(() => {
    const monday = new Date(selectedDate);
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [selectedDate]);

  const counts = useMemo(() => ({
    today: events.filter((event) => sameDay(event.date, new Date())).length,
    tasks: events.filter((event) => event.kind === "task").length,
    showings: events.filter((event) => event.kind === "showing").length,
  }), [events]);

  function moveDay(amount: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
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
              <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                Google Takvim · Yakında
              </button>
            </div>
          </header>

          <section className="grid grid-cols-3 gap-3">
            {[
              ["Bugünkü kayıt", counts.today, "Tüm kaynaklar"],
              ["Görev", counts.tasks, "CRM görevleri"],
              ["Gösterim", counts.showings, "Planlı + geçmiş"],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                <p className="mt-1 hidden text-xs text-slate-400 sm:block">{hint}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => moveDay(-1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">←</button>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{selectedDate.toLocaleDateString("tr-TR", { weekday: "long" })}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</h2>
              </div>
              <button type="button" onClick={() => moveDay(1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">→</button>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {weekDays.map((date) => {
                const active = sameDay(date, selectedDate);
                const today = sameDay(date, new Date());
                const count = events.filter((event) => sameDay(event.date, date)).length;
                return (
                  <button key={dayKey(date)} type="button" onClick={() => setSelectedDate(startOfDay(date))} className={`min-w-0 rounded-xl border p-2 text-center transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"}`}>
                    <span className="block text-[10px] font-semibold uppercase">{date.toLocaleDateString("tr-TR", { weekday: "short" })}</span>
                    <span className="mt-1 block text-sm font-bold">{date.getDate()}</span>
                    <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${count ? (active ? "bg-white" : "bg-slate-900") : "bg-transparent"} `}></span>
                    {today && <span className="sr-only">Bugün</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
          {loading && <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Takvim yükleniyor…</div>}

          {!loading && !error && (
            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Günlük ajanda</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedEvents.length ? `${selectedEvents.length} kayıt` : "Bugün için kayıt yok"}</h2>
                </div>
                <button type="button" onClick={() => setSelectedDate(startOfDay(new Date()))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Bugün</button>
              </div>

              <div className="mt-5 space-y-3">
                {!selectedEvents.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Bu gün için planlanmış görev, gösterim veya takip bulunmuyor.</div>}
                {selectedEvents.map((event) => (
                  <article key={event.id} className={`rounded-2xl border p-4 ${kindStyle[event.kind]}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                        <p className="text-lg font-bold text-slate-900">{formatTime(event.date)}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{kindLabel[event.kind]}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-950">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{event.customerName ?? event.meta}</p>
                        <p className="mt-1 text-xs text-slate-400">{event.meta}</p>
                        {event.status && <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">{event.status}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Entegrasyon hazırlığı</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Google Takvim bağlantısı bu yapının üzerine eklenecek</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Her danışman kendi Google hesabını OAuth ile bağlayacak. Bağlantı kullanıcı bazında tutulacak; özel Google etkinlikleri diğer danışmanlara açılmayacak. PrimeEstate görev ve gösterimleri daha sonra Google Takvim&apos;e aktarılabilecek.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
