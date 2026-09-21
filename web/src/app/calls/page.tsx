"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
};

type Activity = {
  id: string;
  type: string;
  occurredAt: string;
  summary: string;
  outcome: string | null;
  customer: { id: string; name: string };
  owner?: { id: string; name: string; email: string } | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export default function CallsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [calls, setCalls] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [customerResponse, activityResponse] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/activities?limit=100", { cache: "no-store" }),
      ]);
      const [customerData, activityData] = await Promise.all([customerResponse.json(), activityResponse.json()]);
      if (!customerResponse.ok) throw new Error(customerData.message ?? "Müşteriler alınamadı.");
      if (!activityResponse.ok) throw new Error(activityData.message ?? "Aramalar alınamadı.");
      setCustomers(customerData.customers ?? []);
      setCalls((activityData.activities ?? []).filter((item: Activity) => item.type === "ARAMA"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Arama verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return customers.filter((customer) =>
      !q || [customer.name, customer.phone ?? "", customer.location ?? ""].join(" ").toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [customers, query]);

  async function createCall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomerId) return;
    setSaving(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: "ARAMA",
          summary: form.get("summary"),
          outcome: form.get("outcome"),
          occurredAt: form.get("occurredAt"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Arama kaydı oluşturulamadı.");
      setOpen(false);
      setSelectedCustomerId("");
      event.currentTarget.reset();
      await load();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Arama kaydı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  const todayCalls = calls.filter((call) => {
    const date = new Date(call.occurredAt);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Calls</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Aramalar</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Müşteriyi ara, görüşmeyi kaydet ve sonraki aksiyonu ilişkiler geçmişine taşı.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">↻ Yenile</button>
              <button type="button" onClick={() => { setFormError(""); setOpen(true); }} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">+ Arama Kaydı</button>
            </div>
          </header>

          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Bugünkü arama</p><p className="mt-2 text-2xl font-semibold text-slate-950">{todayCalls.length}</p></div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Son kayıtlar</p><p className="mt-2 text-2xl font-semibold text-slate-950">{calls.length}</p></div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Müşteri</p><p className="mt-2 text-2xl font-semibold text-slate-950">{customers.length}</p></div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 p-4">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Müşteri ara…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400" />
              </div>
              <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
                {loading && <p className="p-5 text-sm text-slate-500">Müşteriler yükleniyor…</p>}
                {!loading && filteredCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(customer.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{customer.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{customer.location ?? "Konum belirtilmemiş"}</p>
                    </div>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Ara</a>
                    ) : (
                      <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">Telefon yok</span>
                    )}
                  </div>
                ))}
                {!loading && !filteredCustomers.length && <p className="p-6 text-center text-sm text-slate-500">Müşteri bulunamadı.</p>}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Arama geçmişi</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Son görüşmeler</h2></div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">{calls.length} kayıt</span>
              </div>
              <div className="mt-5 space-y-3">
                {loading && <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Aramalar yükleniyor…</div>}
                {!loading && calls.map((call) => (
                  <article key={call.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">{initials(call.customer.name)}</div>
                        <div>
                          <p className="font-semibold text-slate-900">{call.customer.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(call.occurredAt)}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">Arama</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-800">{call.summary}</p>
                    {call.outcome && <p className="mt-1 text-xs leading-5 text-slate-500">{call.outcome}</p>}
                  </article>
                ))}
                {!loading && !calls.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Henüz arama kaydı yok. İlk görüşmeyi kaydettiğinizde burada görünecek.</div>}
              </div>
            </div>
          </section>

          {open && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
              <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Yeni aktivite</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Arama kaydı</h2></div>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-slate-400">✕</button>
                </div>
                {formError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
                <form onSubmit={createCall} className="mt-4 space-y-3">
                  <select required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm">
                    <option value="">Müşteri seçin</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
                  </select>
                  <input name="occurredAt" type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                  <textarea name="summary" required rows={3} placeholder="Görüşmenin kısa özeti" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                  <textarea name="outcome" rows={2} placeholder="Sonuç / sonraki adım (opsiyonel)" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Vazgeç</button>
                    <button disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">{saving ? "Kaydediliyor…" : "Aramayı Kaydet"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
