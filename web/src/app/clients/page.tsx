"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { customers } from "@/data/customers";
import type { Customer } from "@/types/Customer";

const roleFilters = ["Tümü", "Alıcı", "Kiracı", "Mal Sahibi", "Yatırımcı", "Lead"];

function RoleChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function Score({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function CustomerList({
  items,
  selectedId,
  onSelect,
}: {
  items: Customer[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onSelect(customer.id)}
          className={`w-full p-4 text-left transition hover:bg-slate-50 ${
            selectedId === customer.id ? "bg-slate-50" : "bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {customer.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-semibold text-slate-900">{customer.name}</p>
                <span className="text-xs text-slate-400">{customer.lastContact}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">{customer.location}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customer.roles.slice(0, 2).map((role) => <RoleChip key={role}>{role}</RoleChip>)}
                {customer.roles.length > 2 && <RoleChip>+{customer.roles.length - 2}</RoleChip>}
              </div>
            </div>
          </div>
        </button>
      ))}
      {items.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-500">Bu filtreyle eşleşen müşteri yok.</div>
      )}
    </div>
  );
}

function DemandCard({ demand }: { demand: Customer["demands"][number] }) {
  const urgent = demand.urgency === "Yüksek";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              {demand.type}
            </span>
            {urgent && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Öncelikli</span>
            )}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{demand.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{demand.propertyType} · Güncelleme {demand.updatedAt}</p>
        </div>
        <button type="button" className="self-start rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          ⋯
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Bütçe</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.budget}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">m²</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.size}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Oda</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.rooms}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Aciliyet</p><p className="mt-1 text-sm font-semibold text-slate-800">{demand.urgency}</p></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {demand.locations.map((location) => (
          <span key={location} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600">{location}</span>
        ))}
      </div>
      {demand.notes && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{demand.notes}</p>}
    </article>
  );
}

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Tümü");
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? 1);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return customers.filter((customer) => {
      const matchesQuery = !normalized || `${customer.name} ${customer.location} ${customer.email}`.toLocaleLowerCase("tr-TR").includes(normalized);
      const matchesRole = role === "Tümü" || customer.roles.includes(role as Customer["roles"][number]);
      return matchesQuery && matchesRole;
    });
  }, [query, role]);

  const selected = customers.find((customer) => customer.id === selectedId) ?? filteredCustomers[0] ?? customers[0];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate Workspace</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Müşteriler</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Müşteri, roller ve talepleri tek kayıtta yönetin. Aynı kişi için tekrar tekrar kayıt açmadan tüm ilişkiyi buradan takip edin.</p>
              </div>
              <button type="button" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">+ Yeni Müşteri</button>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Müşteri ara..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white" />
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                  {roleFilters.map((item) => (
                    <button key={item} type="button" onClick={() => setRole(item)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${role === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{item}</button>
                  ))}
                </div>
              </div>
              <CustomerList items={filteredCustomers} selectedId={selected?.id ?? selectedId} onSelect={setSelectedId} />
            </section>

            {selected ? (
              <section className="min-w-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">{selected.initials}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selected.name}</h2>{selected.roles.map((item) => <RoleChip key={item}>{item}</RoleChip>)}</div>
                        <p className="mt-1 text-sm text-slate-500">{selected.location} · {selected.phone}</p>
                        <p className="mt-1 text-sm text-slate-400">{selected.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Not ekle</button>
                      <button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">İletişime geç</button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">İlişki skoru</p><div className="mt-2"><Score value={selected.relationshipScore} /></div></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Son iletişim</p><p className="mt-2 text-sm font-semibold text-slate-800">{selected.lastContact}</p></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-2 text-sm font-semibold text-slate-800">{selected.nextAction}</p><p className="mt-0.5 text-xs text-slate-500">{selected.nextActionDate}</p></div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Talep profilleri</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Aktif Talepler <span className="text-slate-400">{selected.demands.length}</span></h2></div><button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">+ Yeni Talep</button></div>
                <div className="mt-4 space-y-4">{selected.demands.map((demand) => <DemandCard key={demand.id} demand={demand} />)}</div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kaynak</p><p className="mt-2 font-semibold text-slate-900">{selected.source}</p><p className="mt-1 text-sm text-slate-500">Sorumlu danışman: {selected.owner}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime’ın önerisi · V1 önizleme</p><p className="mt-2 text-sm leading-6 text-slate-200">Talep kriterleri ve son iletişim bilgilerine göre bir sonraki aksiyonu öne çıkarabiliriz. Gerçek AI bağlantısı sonraki aşamada bu veri modeline bağlanacak.</p></div>
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Görüntülenecek müşteri bulunamadı.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
