"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Customer = {
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
  roles: { role: string }[];
  demands: { id: string; title: string; type: string; propertyType: string; urgency: string }[];
  owner: { id: string; name: string; email: string };
};

type Activity = {
  id: string;
  type: string;
  occurredAt: string;
  summary: string;
  outcome: string | null;
  customer: { id: string; name: string };
};

type Task = {
  id: string;
  title: string;
  dueAt: string;
  priority: string;
  status: string;
  customer: { id: string; name: string } | null;
};

const roleMap: Record<string,string> = { ALICI:"Alıcı", KIRACI:"Kiracı", MAL_SAHIBI:"Mal Sahibi", SATICI:"Satıcı", YATIRIMCI:"Yatırımcı", LEAD:"Lead", GECMIS_MUSTERI:"Geçmiş Müşteri" };
const activityMap: Record<string,string> = { ARAMA:"Arama", WHATSAPP:"WhatsApp", EMAIL:"E-posta", NOT:"Not", GOSTERIM:"Gösterim", TEKLIF:"Teklif" };
const statusMap: Record<string,string> = { BEKLIYOR:"Bekliyor", TAMAMLANDI:"Tamamlandı", GECIKTI:"Gecikti" };
const priorityMap: Record<string,string> = { YUKSEK:"Yüksek", NORMAL:"Normal", DUSUK:"Düşük" };

function date(value: string | null) { return value ? new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "Henüz yok"; }
function initials(name:string) { return name.split(/\s+/).slice(0,2).map(x=>x[0]??"").join("").toUpperCase(); }

export default function RelationshipsPage() {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [activities,setActivities]=useState<Activity[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [c,a,t]=await Promise.all([
        fetch("/api/customers").then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.message??"Müşteriler alınamadı."); return d.customers as Customer[];}),
        fetch("/api/activities?limit=20").then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.message??"Aktiviteler alınamadı."); return d.activities as Activity[];}),
        fetch("/api/tasks?limit=20").then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.message??"Görevler alınamadı."); return d.tasks as Task[];})
      ]);
      setCustomers(c); setActivities(a); setTasks(t); setSelectedId(current=>current && c.some(x=>x.id===current) ? current : c[0]?.id??"");
    } catch(e) { setError(e instanceof Error ? e.message : "İlişki verileri alınamadı."); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ void load(); },[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("tr-TR");
    return customers.filter(c=>!q || [c.name,c.phone??"",c.email??"",c.location??"",...c.roles.map(r=>roleMap[r.role]??r.role)].join(" ").toLocaleLowerCase("tr-TR").includes(q));
  },[customers,query]);

  const selected=customers.find(c=>c.id===selectedId)??null;
  const customerActivities=activities.filter(a=>a.customer.id===selectedId);
  const customerTasks=tasks.filter(t=>t.customer?.id===selectedId);
  const openTasks=tasks.filter(t=>t.status!=="TAMAMLANDI").length;

  return <div className="flex min-h-screen bg-slate-50">
    <Sidebar/>
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Relationship Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">İlişkiler</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Müşterinin kim olduğunu, en son ne yaşandığını ve sıradaki aksiyonu tek ekranda görün.</p></div>
          <button type="button" onClick={()=>void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">↻ Yenile</button>
        </header>

        {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[["Müşteri",customers.length],["Açık görev",openTasks],["Son aktiviteler",activities.length]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>)}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 p-4"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Müşteri ara…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"/></div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {loading?<p className="p-5 text-sm text-slate-500">İlişkiler yükleniyor…</p>:filtered.map(c=><button key={c.id} type="button" onClick={()=>setSelectedId(c.id)} className={"w-full p-4 text-left hover:bg-slate-50 "+(selectedId===c.id?"bg-slate-50":"")}>
                <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(c.name)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold text-slate-900">{c.name}</p><span className="text-xs font-semibold text-slate-500">{c.relationshipScore}</span></div><p className="mt-1 truncate text-xs text-slate-500">{c.location||"Konum belirtilmemiş"}</p><div className="mt-2 flex flex-wrap gap-1">{c.roles.slice(0,2).map(r=><span key={r.role} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{roleMap[r.role]??r.role}</span>)}</div></div></div>
              </button>)}
              {!loading&&!filtered.length&&<p className="p-6 text-center text-sm text-slate-500">Müşteri bulunamadı.</p>}
            </div>
          </div>

          {selected?<div className="space-y-5">
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 font-bold">{initials(selected.name)}</div><div><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Müşteri ilişkisi</p><h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-slate-400">{selected.phone||"Telefon yok"} · {selected.email||"E-posta yok"}</p></div></div><div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-xs text-slate-400">İlişki skoru</p><p className="text-2xl font-semibold">{selected.relationshipScore}</p></div></div>
              <div className="mt-5 flex flex-wrap gap-2">{selected.roles.map(r=><span key={r.role} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">{roleMap[r.role]??r.role}</span>)}</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">Son temas</p><p className="mt-1 text-sm font-medium">{date(selected.lastContactAt)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-1 text-sm font-medium">{selected.nextAction||"Belirlenmemiş"}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">Sorumlu</p><p className="mt-1 text-sm font-medium">{selected.owner.name}</p></div></div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Timeline</p><h3 className="mt-1 text-lg font-semibold text-slate-950">İletişim geçmişi</h3></div><span className="text-xs text-slate-400">{customerActivities.length} kayıt</span></div><div className="mt-4 space-y-3">{customerActivities.map(a=><div key={a.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-slate-500">{activityMap[a.type]??a.type}</span><span className="text-xs text-slate-400">{date(a.occurredAt)}</span></div><p className="mt-2 text-sm font-semibold text-slate-900">{a.summary}</p>{a.outcome&&<p className="mt-1 text-xs text-slate-500">{a.outcome}</p>}</div>)}{!customerActivities.length&&<p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Henüz iletişim kaydı yok.</p>}</div></section>

              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Follow-up</p><h3 className="mt-1 text-lg font-semibold text-slate-950">Takip işleri</h3></div><span className="text-xs text-slate-400">{customerTasks.length} kayıt</span></div><div className="mt-4 space-y-3">{customerTasks.map(t=><div key={t.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{t.title}</p><p className="mt-1 text-xs text-slate-500">{date(t.dueAt)}</p></div><div className="text-right"><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{priorityMap[t.priority]??t.priority}</span><p className="mt-2 text-[11px] text-slate-400">{statusMap[t.status]??t.status}</p></div></div></div>)}{!customerTasks.length&&<p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Açık takip işi yok.</p>}</div></section>
            </div>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Talep</p><h3 className="mt-1 text-lg font-semibold text-slate-950">Müşterinin aktif talepleri</h3></div><span className="text-xs text-slate-400">{selected.demands.length} talep</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{selected.demands.map(d=><div key={d.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{d.title}</p><p className="mt-1 text-sm text-slate-500">{d.type==="SATIN_ALMA"?"Satın alma":"Kiralama"} · {d.propertyType}</p><p className="mt-2 text-xs font-semibold text-slate-400">{d.urgency}</p></div>)}{!selected.demands.length&&<p className="text-sm text-slate-500">Aktif talep yok.</p>}</div></section>
          </div>:<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Bir müşteri seçin.</div>}
        </section>
      </div>
    </main>
  </div>;
}
