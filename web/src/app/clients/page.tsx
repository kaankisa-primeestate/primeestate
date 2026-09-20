"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "@/components/Sidebar";

type ApiDemand = {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  locations: unknown;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  currency: string;
  minSize: string | number | null;
  maxSize: string | number | null;
  rooms: string | null;
  urgency: string;
  notes: string | null;
  updatedAt: string;
};

type ApiCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  source: string | null;
  relationshipScore: number;
  lastContactAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  notes: string | null;
  roles: { role: string }[];
  demands: ApiDemand[];
  owner: { id: string; name: string; email: string };
};

const roleMap: Record<string, string> = {
  ALICI: "Alıcı", KIRACI: "Kiracı", MAL_SAHIBI: "Mal Sahibi", SATICI: "Satıcı",
  YATIRIMCI: "Yatırımcı", LEAD: "Lead", GECMIS_MUSTERI: "Geçmiş Müşteri",
};
const roleApiMap: Record<string, string> = {
  Tümü: "", Alıcı: "ALICI", Kiracı: "KIRACI", "Mal Sahibi": "MAL_SAHIBI",
  Yatırımcı: "YATIRIMCI", Lead: "LEAD",
};
const demandTypeMap: Record<string, string> = { SATIN_ALMA: "Satın Alma", KIRALAMA: "Kiralama" };
const propertyTypeMap: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", IS_YERI: "İş Yeri", BINA: "Bina", DEVRE_MULK: "Devre Mülk",
};
const urgencyMap: Record<string, string> = { YUKSEK: "Yüksek", NORMAL: "Normal", DUSUK: "Düşük" };
const roleFilters = ["Tümü", "Alıcı", "Kiracı", "Mal Sahibi", "Yatırımcı", "Lead"];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? "").join("");
}
function displayDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
function displayDateOnly(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}
function money(value: string | number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Number(value)) + " " + currency;
}
function jsonLocations(value: unknown) {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}
function RoleChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{children}</span>;
}
function Score({ value }: { value: number }) {
  return <div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: value + "%" }} /></div><span className="text-xs font-semibold text-slate-700">{value}</span></div>;
}

function CustomerList({ items, selectedId, onSelect }: {
  items: ApiCustomer[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  return <div className="divide-y divide-slate-100">
    {items.map((customer) => <button key={customer.id} type="button" onClick={() => onSelect(customer.id)}
      className={"w-full p-4 text-left transition hover:bg-slate-50 " + (selectedId === customer.id ? "bg-slate-50" : "bg-white")}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(customer.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><p className="truncate font-semibold text-slate-900">{customer.name}</p><span className="text-xs text-slate-400">{displayDate(customer.lastContactAt)}</span></div>
          <p className="mt-0.5 truncate text-sm text-slate-500">{customer.location || "Konum belirtilmemiş"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{customer.roles.slice(0, 2).map((role) => <RoleChip key={role.role}>{roleMap[role.role] ?? role.role}</RoleChip>)}{customer.roles.length > 2 && <RoleChip>+{customer.roles.length - 2}</RoleChip>}</div>
        </div>
      </div>
    </button>)}
    {items.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Bu filtreyle eşleşen müşteri yok.</div>}
  </div>;
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Tümü");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDemandCreate, setShowDemandCreate] = useState(false);
  const [demandSaving, setDemandSaving] = useState(false);

  async function loadCustomers() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (role !== "Tümü") params.set("role", roleApiMap[role] ?? "");
      const res = await fetch("/api/customers?" + params.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Müşteriler yüklenemedi.");
      const next: ApiCustomer[] = data.customers ?? [];
      setCustomers(next);
      setSelectedId((current) => current && next.some((x) => x.id === current) ? current : next[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Müşteriler yüklenemedi.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCustomers(), 250);
    return () => window.clearTimeout(timer);
  }, [query, role]);

  const selected = useMemo(() => customers.find((x) => x.id === selectedId) ?? customers[0] ?? null, [customers, selectedId]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"), phone: form.get("phone"), email: form.get("email"),
          location: form.get("location"), source: form.get("source"), notes: form.get("notes"),
          roles: form.getAll("roles").filter((x): x is string => typeof x === "string"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Müşteri oluşturulamadı.");
      setShowCreate(false); formElement.reset(); await loadCustomers(); setSelectedId(data.customer.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Müşteri oluşturulamadı.");
    } finally { setSaving(false); }
  }

  async function createDemand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setDemandSaving(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const locations = String(form.get("locations") || "").split(",").map((value) => value.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/customers/" + selected.id + "/demands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"), type: form.get("type"), propertyType: form.get("propertyType"),
          locations, budgetMin: form.get("budgetMin") || null, budgetMax: form.get("budgetMax") || null,
          currency: form.get("currency") || "TRY", minSize: form.get("minSize") || null,
          maxSize: form.get("maxSize") || null, rooms: form.get("rooms"),
          urgency: form.get("urgency") || "NORMAL", notes: form.get("notes"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Talep oluşturulamadı.");
      setShowDemandCreate(false);
      formElement.reset();
      await loadCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep oluşturulamadı.");
    } finally {
      setDemandSaving(false);
    }
  }

  return <div className="min-h-screen bg-slate-50 md:flex">
    <Sidebar />
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
      <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate Workspace</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Müşteriler</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Gerçek müşteri kayıtlarını, rolleri ve talepleri tek kayıtta yönetin.</p>
        </div><button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Yeni Müşteri</button></div>
      </header>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4">
          <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Müşteri ara..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white" /></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{roleFilters.map((item) => <button key={item} type="button" onClick={() => setRole(item)} className={"whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold " + (role === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>{item}</button>)}</div>
        </div>{loading ? <div className="p-8 text-center text-sm text-slate-500">Müşteriler yükleniyor…</div> : <CustomerList items={customers} selectedId={selectedId} onSelect={setSelectedId} />}</section>

        {selected ? <section className="min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">{initials(selected.name)}</div><div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selected.name}</h2>{selected.roles.map((x) => <RoleChip key={x.role}>{roleMap[x.role] ?? x.role}</RoleChip>)}</div>
            <p className="mt-1 text-sm text-slate-500">{selected.location || "Konum belirtilmemiş"} · {selected.phone || "Telefon yok"}</p><p className="mt-1 text-sm text-slate-400">{selected.email || "E-posta yok"}</p>
          </div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">İlişki skoru</p><div className="mt-2"><Score value={selected.relationshipScore} /></div></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Son iletişim</p><p className="mt-2 text-sm font-semibold text-slate-800">{displayDate(selected.lastContactAt)}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-2 text-sm font-semibold text-slate-800">{selected.nextAction || "Aksiyon tanımlanmamış"}</p><p className="mt-0.5 text-xs text-slate-500">{displayDate(selected.nextActionAt)}</p></div>
          </div></div>

          <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Talep profilleri</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Aktif Talepler <span className="text-slate-400">{selected.demands.length}</span></h2></div><button type="button" onClick={() => setShowDemandCreate(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Yeni Talep</button></div>
          <div className="mt-4 space-y-4">{selected.demands.length ? selected.demands.map((demand) => <article key={demand.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{demandTypeMap[demand.type] ?? demand.type}</span>{demand.urgency === "YUKSEK" && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Öncelikli</span>}</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">{demand.title}</h3><p className="mt-1 text-sm text-slate-500">{propertyTypeMap[demand.propertyType] ?? demand.propertyType} · Güncelleme {displayDateOnly(demand.updatedAt)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Bütçe</p><p className="mt-1 text-sm font-semibold text-slate-800">{money(demand.budgetMin, demand.currency)}{demand.budgetMax !== null ? " – " + money(demand.budgetMax, demand.currency) : ""}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">m²</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.minSize !== null || demand.maxSize !== null ? [demand.minSize, demand.maxSize].filter((x) => x !== null).join(" – ") : "—"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Oda</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.rooms || "—"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Aciliyet</p><p className="mt-1 text-sm font-semibold text-slate-800">{urgencyMap[demand.urgency] ?? demand.urgency}</p></div>
            </div>
            {jsonLocations(demand.locations).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{jsonLocations(demand.locations).map((location) => <span key={location} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600">{location}</span>)}</div>}
            {demand.notes && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{demand.notes}</p>}
          </article>) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Bu müşterinin henüz aktif talebi yok.</div>}</div>

          <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kaynak</p><p className="mt-2 font-semibold text-slate-900">{selected.source || "Belirtilmemiş"}</p><p className="mt-1 text-sm text-slate-500">Sorumlu danışman: {selected.owner.name}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime’ın önerisi · V1</p><p className="mt-2 text-sm leading-6 text-slate-200">Bu ekran artık seed veri yerine yetkili gerçek müşteri verisini kullanıyor.</p></div></div>
        </section> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{loading ? "Müşteriler yükleniyor…" : "Görüntülenecek müşteri bulunamadı."}</div>}
      </div>
    </div></main>

    {showDemandCreate && selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">CRM · ${selected.name}</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Yeni Talep</h2></div><button type="button" onClick={() => setShowDemandCreate(false)} className="text-xl text-slate-400">×</button></div>
        <form onSubmit={createDemand} className="mt-6 space-y-4">
          <label className="block"><span className="text-sm font-semibold text-slate-700">Talep başlığı *</span><input name="title" required placeholder="Örn. Bostancı'da 3+1 satın alma" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold text-slate-700">Talep tipi *</span><select name="type" defaultValue="SATIN_ALMA" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="SATIN_ALMA">Satın Alma</option><option value="KIRALAMA">Kiralama</option></select></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Gayrimenkul tipi *</span><select name="propertyType" defaultValue="DAIRE" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{Object.entries(propertyTypeMap).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Lokasyonlar</span><input name="locations" placeholder="Bostancı, Suadiye, Caddebostan" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /><span className="mt-1 block text-xs text-slate-400">Birden fazla lokasyonu virgülle ayırın.</span></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="text-sm font-semibold text-slate-700">Min. bütçe</span><input name="budgetMin" type="number" min="0" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Max. bütçe</span><input name="budgetMax" type="number" min="0" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Para birimi</span><select name="currency" defaultValue="TRY" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="text-sm font-semibold text-slate-700">Min. m²</span><input name="minSize" type="number" min="0" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Max. m²</span><input name="maxSize" type="number" min="0" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Oda</span><input name="rooms" placeholder="3+1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold text-slate-700">Aciliyet</span><select name="urgency" defaultValue="NORMAL" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="YUKSEK">Yüksek</option><option value="NORMAL">Normal</option><option value="DUSUK">Düşük</option></select></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><input name="notes" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowDemandCreate(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button type="submit" disabled={demandSaving} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{demandSaving ? "Kaydediliyor…" : "Talebi Kaydet"}</button></div>
        </form>
      </div>
    </div>}
    {showCreate && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">CRM</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Yeni Müşteri</h2></div><button type="button" onClick={() => setShowCreate(false)} className="text-xl text-slate-400">×</button></div>
      <form onSubmit={createCustomer} className="mt-6 space-y-4">
        <label className="block"><span className="text-sm font-semibold text-slate-700">Ad Soyad *</span><input name="name" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-slate-700">Telefon</span><input name="phone" type="tel" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">E-posta</span><input name="email" type="email" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label></div>
        <label className="block"><span className="text-sm font-semibold text-slate-700">Konum</span><input name="location" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
        <label className="block"><span className="text-sm font-semibold text-slate-700">Kaynak</span><input name="source" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
        <fieldset><legend className="text-sm font-semibold text-slate-700">Roller</legend><div className="mt-2 grid grid-cols-2 gap-2">{roleFilters.slice(1).map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><input type="checkbox" name="roles" value={roleApiMap[item]} />{item}</label>)}</div></fieldset>
        <label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><textarea name="notes" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
        <div className="flex gap-3"><button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Müşteriyi Kaydet"}</button></div>
      </form>
    </div></div>}
  </div>;
}
