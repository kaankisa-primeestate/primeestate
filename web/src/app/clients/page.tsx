"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";




type ApiCustomer = {
  id: string; name: string; phone: string | null; email: string | null; location: string | null;
  source: string | null; relationshipScore: number; lastContactAt: string | null; nextAction: string | null;
  nextActionAt: string | null; notes: string | null; roles: { role: string }[]; demands: ApiDemand[];
  owner: { id: string; name: string; email: string };
};
type ApiDemand = {
  id: string; title: string; type: string; propertyType: string; locations: unknown;
  budgetMin: string | number | null; budgetMax: string | number | null; currency: string;
  minSize: string | number | null; maxSize: string | number | null; rooms: string | null;
  urgency: string; notes: string | null; updatedAt: string;
};
const roleMap: Record<string,string> = { ALICI:"Alıcı",KIRACI:"Kiracı",MAL_SAHIBI:"Mal Sahibi",SATICI:"Satıcı",YATIRIMCI:"Yatırımcı",LEAD:"Lead",GECMIS_MUSTERI:"Geçmiş Müşteri" };
const roleApiMap: Record<string,string> = { "Tümü":"", "Alıcı":"ALICI", "Kiracı":"KIRACI", "Mal Sahibi":"MAL_SAHIBI", "Yatırımcı":"YATIRIMCI", "Lead":"LEAD" };
const demandTypeMap: Record<string,string> = { SATIN_ALMA:"Satın Alma",KIRALAMA:"Kiralama" };
const propertyTypeMap: Record<string,string> = { DAIRE:"Daire",VILLA:"Villa",ARSA:"Arsa",IS_YERI:"İş Yeri",BINA:"Bina",DEVRE_MULK:"Devre Mülk" };
const urgencyMap: Record<string,string> = { YUKSEK:"Yüksek",NORMAL:"Normal",DUSUK:"Düşük" };
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()??"").join("");}
function displayDate(value:string|null){return value?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}
function displayDateOnly(value:string){return new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium"}).format(new Date(value));}
function money(value:string|number|null,currency:string){if(value===null)return "—";return new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}).format(Number(value))+" "+currency;}
function jsonLocations(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[];}

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
  items: ApiCustomer;
  selectedId: string;
  onSelect: (id: string) => void;
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

function DemandCard({ demand }: { demand: ApiCustomer }) {
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
  const [customers,setCustomers]=useState<ApiApiCustomer>([]);
  const [query,setQuery]=useState(""); const [role,setRole]=useState("Tümü");
  const [selectedId,setSelectedId]=useState<string|null>(null); const [loading,setLoading]=useState(true);
  const [error,setError]=useState(""); const [showCreate,setShowCreate]=useState(false); const [saving,setSaving]=useState(false);

  async function loadCustomers(){
    setLoading(true); setError("");
    try{
      const params=new URLSearchParams(); if(query.trim())params.set("q",query.trim()); if(role!=="Tümü")params.set("role",roleApiMap[role]??"");
      const res=await fetch("/api/customers?"+params.toString(),{cache:"no-store"}); const data=await res.json();
      if(!res.ok)throw new Error(data.message||"Müşteriler yüklenemedi.");
      const next=data.customers??[]; setCustomers(next);
      setSelectedId(current=>current&&next.some((x:ApiCustomer)=>x.id===current)?current:next[0]?.id??null);
    }catch(e){setError(e instanceof Error?e.message:"Müşteriler yüklenemedi.");}finally{setLoading(false);}
  }
  useEffect(()=>{const t=window.setTimeout(()=>void loadCustomers(),250);return()=>window.clearTimeout(t);},[query,role]);
  const selected=useMemo(()=>customers.find(x=>x.id===selectedId)??customers[0]??null,[customers,selectedId]);

  async function createCustomer(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");const form=new FormData(event.currentTarget);
    try{
      const res=await fetch("/api/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        name:form.get("name"),phone:form.get("phone"),email:form.get("email"),location:form.get("location"),source:form.get("source"),notes:form.get("notes"),
        roles:form.getAll("roles").filter((x):x is string=>typeof x==="string")
      })});
      const data=await res.json();if(!res.ok)throw new Error(data.message||"Müşteri oluşturulamadı.");
      setShowCreate(false);event.currentTarget.reset();await loadCustomers();setSelectedId(data.customer.id);
    }catch(e){setError(e instanceof Error?e.message:"Müşteri oluşturulamadı.");}finally{setSaving(false);}
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
      <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate Workspace</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Müşteriler</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Gerçek müşteri kayıtlarını, rolleri ve talepleri tek kayıtta yönetin.</p></div>
        <button type="button" onClick={()=>setShowCreate(true)} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Yeni Müşteri</button></div>
      </header>
      {error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Müşteri ara..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white"/></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{roleFilters.map(item=><button key={item} type="button" onClick={()=>setRole(item)} className={"whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold "+(role===item?"bg-slate-900 text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200")}>{item}</button>)}</div>
        </div>{loading?<div className="p-8 text-center text-sm text-slate-500">Müşteriler yükleniyor…</div>:<CustomerList items={customers as never[]} selectedId={selected?.id as never} onSelect={(id)=>setSelectedId(String(id))}/>}</section>
        {selected?<section className="min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">{initials(selected.name)}</div><div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selected.name}</h2>{selected.roles.map(x=><RoleChip key={x.role}>{roleMap[x.role]??x.role}</RoleChip>)}</div>
            <p className="mt-1 text-sm text-slate-500">{selected.location||"Konum belirtilmemiş"} · {selected.phone||"Telefon yok"}</p><p className="mt-1 text-sm text-slate-400">{selected.email||"E-posta yok"}</p>
          </div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">İlişki skoru</p><div className="mt-2"><Score value={selected.relationshipScore}/></div></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Son iletişim</p><p className="mt-2 text-sm font-semibold text-slate-800">{displayDate(selected.lastContactAt)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-2 text-sm font-semibold text-slate-800">{selected.nextAction||"Aksiyon tanımlanmamış"}</p><p className="mt-0.5 text-xs text-slate-500">{displayDate(selected.nextActionAt)}</p></div></div></div>
          <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Talep profilleri</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Aktif Talepler <span className="text-slate-400">{selected.demands.length}</span></h2></div><button type="button" disabled className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400">+ Yeni Talep</button></div>
          <div className="mt-4 space-y-4">{selected.demands.length?selected.demands.map(d=><article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{demandTypeMap[d.type]??d.type}</span>{d.urgency==="YUKSEK"&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Öncelikli</span>}</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">{d.title}</h3><p className="mt-1 text-sm text-slate-500">{propertyTypeMap[d.propertyType]??d.propertyType} · Güncelleme {displayDateOnly(d.updatedAt)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Bütçe</p><p className="mt-1 text-sm font-semibold text-slate-800">{money(d.budgetMin,d.currency)}{d.budgetMax!==null?" – "+money(d.budgetMax,d.currency):""}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">m²</p><p className="mt-1 text-sm font-semibold text-slate-800">{d.minSize!==null||d.maxSize!==null?String(d.minSize??"")+" – "+String(d.maxSize??""): "—"}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Oda</p><p className="mt-1 text-sm font-semibold text-slate-800">{d.rooms||"—"}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Aciliyet</p><p className="mt-1 text-sm font-semibold text-slate-800">{urgencyMap[d.urgency]??d.urgency}</p></div></div>
            {jsonLocations(d.locations).length>0&&<div className="mt-4 flex flex-wrap gap-2">{jsonLocations(d.locations).map(location=><span key={location} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600">{location}</span>)}</div>}{d.notes&&<p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{d.notes}</p>}</article>):<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Bu müşterinin henüz aktif talebi yok.</div>}</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kaynak</p><p className="mt-2 font-semibold text-slate-900">{selected.source||"Belirtilmemiş"}</p><p className="mt-1 text-sm text-slate-500">Sorumlu danışman: {selected.owner.name}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime’ın önerisi · V1</p><p className="mt-2 text-sm leading-6 text-slate-200">Bu ekran artık seed veri yerine yetkili gerçek müşteri verisini kullanıyor.</p></div></div>
        </section>:<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{loading?"Müşteriler yükleniyor…":"Görüntülenecek müşteri bulunamadı."}</div>}
      </div>
    </div></main>
    {showCreate&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">CRM</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Yeni Müşteri</h2></div><button type="button" onClick={()=>setShowCreate(false)} className="text-xl text-slate-400">×</button></div>
      <form onSubmit={createCustomer} className="mt-6 space-y-4"><label className="block"><span className="text-sm font-semibold text-slate-700">Ad Soyad *</span><input name="name" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-slate-700">Telefon</span><input name="phone" type="tel" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="block"><span className="text-sm font-semibold text-slate-700">E-posta</span><input name="email" type="email" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div>
      <label className="block"><span className="text-sm font-semibold text-slate-700">Konum</span><input name="location" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
      <label className="block"><span className="text-sm font-semibold text-slate-700">Kaynak</span><input name="source" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
      <fieldset><legend className="text-sm font-semibold text-slate-700">Roller</legend><div className="mt-2 grid grid-cols-2 gap-2">{roleFilters.slice(1).map(item=><label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><input type="checkbox" name="roles" value={roleApiMap[item]}/>{item}</label>)}</div></fieldset>
      <label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><textarea name="notes" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
      <div className="flex gap-3"><button type="button" onClick={()=>setShowCreate(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Kaydediliyor…":"Müşteriyi Kaydet"}</button></div></form>
    </div></div>}
    </div>
  );
}