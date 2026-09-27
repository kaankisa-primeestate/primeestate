"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Customer = {
  id: string; name: string; phone: string | null; email: string | null;
  location: string | null; source: string | null; notes: string | null;
  relationshipScore: number; lastContactAt: string | null; nextAction: string | null;
  nextActionAt: string | null; roles: { role: string }[];
  owner: { id: string; name: string; email: string };
  demands: Array<{ id:string; title:string; type:string; propertyType:string; locations:unknown;
    budgetMin:string|number|null; budgetMax:string|number|null; currency:string;
    minSize:string|number|null; maxSize:string|number|null; rooms:string|null; urgency:string; notes:string|null; }>;
  activities: Array<{id:string; type:string; occurredAt:string; summary:string; outcome:string|null}>;
  tasks: Array<{id:string; title:string; dueAt:string; priority:string; status:string}>;
  showings: Array<{id:string; status:string; dateTime:string; note:string|null;
    listing:{id:string; code:string; title:string; price:string|number; currency:string}}>;
};

type Offer = {id:string; status:string; amount:string|number; currency:string; offeredAt:string;
  nextAction:string|null; listing:{id:string; code:string; title:string; price:string|number; currency:string}};
type Sale = {id:string; amount:string|number; currency:string; createdAt:string; note:string|null;
  listing:{id:string; code:string; title:string; price:string|number; currency:string};
  offer:{id:string; status:string; offeredAt:string}};

const roles:Record<string,string>={ALICI:"Alıcı",KIRACI:"Kiracı",MAL_SAHIBI:"Mal Sahibi",SATICI:"Satıcı",YATIRIMCI:"Yatırımcı",LEAD:"Lead",GECMIS_MUSTERI:"Geçmiş Müşteri"};
const status:Record<string,string>={PLANLANDI:"Planlandı",GERCEKLESTI:"Gerçekleşti",IPTAL:"İptal",TASLAK:"Taslak",SUNULDU:"Sunuldu",KARSILIKLI_TEKLIF:"Karşılıklı Teklif",KABUL:"Kabul",REDDEDILDI:"Reddedildi"};
const date=(v:string|null)=>v?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
const money=(v:string|number,c:string)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}).format(Number(v))+" "+c;
const initials=(n:string)=>n.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()??"").join("");

export default function Customer360Page(){
  const params=useParams<{id:string}>();
  const id=params.id;
  const [customer,setCustomer]=useState<Customer|null>(null);
  const [offers,setOffers]=useState<Offer[]>([]);
  const [sales,setSales]=useState<Sale[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    try{
      const q="?customerId="+encodeURIComponent(id);
      const [customerRes,offerRes,saleRes]=await Promise.all([
        fetch("/api/customers/"+encodeURIComponent(id),{cache:"no-store"}),
        fetch("/api/offers"+q,{cache:"no-store"}),
        fetch("/api/sales"+q,{cache:"no-store"}),
      ]);
      const [customerData,offerData,saleData]=await Promise.all([customerRes.json(),offerRes.json(),saleRes.json()]);
      if(!customerRes.ok) throw new Error(customerData.message||"Müşteri yüklenemedi.");
      if(!offerRes.ok) throw new Error(offerData.message||"Teklifler yüklenemedi.");
      if(!saleRes.ok) throw new Error(saleData.message||"Satışlar yüklenemedi.");
      setCustomer(customerData.customer); setOffers(offerData.offers??[]); setSales(saleData.sales??[]);
    }catch(e){setError(e instanceof Error?e.message:"Müşteri detayları yüklenemedi.");}
    finally{setLoading(false);}
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{if(id) void load();},[id]);

  const timeline=useMemo(()=>{
    if(!customer)return [];
    const items=[
      ...customer.activities.map(x=>({key:"a"+x.id,date:x.occurredAt,type:"Aktivite",title:x.summary,detail:x.outcome})),
      ...customer.showings.map(x=>({key:"g"+x.id,date:x.dateTime,type:"Gösterim",title:x.listing.title,detail:status[x.status]??x.status})),
      ...offers.map(x=>({key:"o"+x.id,date:x.offeredAt,type:"Teklif",title:x.listing.title,detail:money(x.amount,x.currency)+" · "+(status[x.status]??x.status)})),
      ...sales.map(x=>({key:"s"+x.id,date:x.createdAt,type:"Satış",title:x.listing.title,detail:money(x.amount,x.currency)})),
    ];
    return items.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,20);
  },[customer,offers,sales]);

  if(loading)return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="flex-1 p-6 lg:p-8"><div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-sm text-slate-500">Müşteri yükleniyor…</div></main></div>;
  if(error||!customer)return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="flex-1 p-6 lg:p-8"><div className="mx-auto max-w-6xl"><Link href="/clients" className="text-sm font-semibold text-slate-700">← Müşteriler</Link><div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error||"Müşteri bulunamadı."}</div></div></main></div>;

  return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/clients" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Müşteriler</Link><Link href={"/clients/"+id+"/edit"} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Düzenle</Link></div>
      <section className="mt-4 rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-bold">{initials(customer.name)}</div><div><p className="text-xs uppercase tracking-[.16em] text-slate-400">Müşteri 360°</p><h1 className="mt-1 text-2xl font-semibold">{customer.name}</h1><p className="mt-1 text-sm text-slate-300">{customer.phone||"Telefon yok"} · {customer.email||"E-posta yok"}</p><div className="mt-3 flex flex-wrap gap-2">{customer.roles.map(r=><span key={r.role} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{roles[r.role]??r.role}</span>)}</div></div></div><div className="flex flex-wrap gap-2">{customer.phone&&<a href={"tel:"+customer.phone} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">Ara</a>}<Link href={"/sales/activity/new?customerId="+encodeURIComponent(id)} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">Aktivite</Link><Link href={"/sales/task/new?customerId="+encodeURIComponent(id)} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">Görev</Link></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">İlişki skoru</p><p className="mt-1 text-2xl font-semibold">{customer.relationshipScore}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">Son temas</p><p className="mt-1 text-sm font-semibold">{date(customer.lastContactAt)}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-1 text-sm font-semibold">{customer.nextAction||"Tanımlanmamış"}</p><p className="text-xs text-slate-400">{date(customer.nextActionAt)}</p></div></div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-4">
        {[["Talep",customer.demands.length],["Gösterim",customer.showings.length],["Teklif",offers.length],["Satış",sales.length]].map(([label,count])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{count}</p></div>)}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Aktif talepler</h2><Link href={"/clients/"+id+"/demand/new"} className="text-sm font-semibold text-slate-700">+ Talep</Link></div><div className="mt-4 space-y-3">{customer.demands.map(d=><div key={d.id} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{d.title}</p><p className="mt-1 text-xs text-slate-500">{d.type} · {d.propertyType} · {d.rooms||"Oda belirtilmemiş"}</p><p className="mt-2 text-sm font-semibold">{d.budgetMin!==null?money(d.budgetMin,d.currency):"Bütçe belirtilmemiş"}{d.budgetMax!==null?" – "+money(d.budgetMax,d.currency):""}</p></div>)}{!customer.demands.length&&<p className="text-sm text-slate-500">Aktif talep yok.</p>}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Açık görevler</h2><div className="mt-4 space-y-3">{customer.tasks.filter(t=>t.status!=="TAMAMLANDI").slice(0,8).map(t=><div key={t.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{t.title}</p><span className="text-xs text-slate-500">{t.priority}</span></div><p className="mt-1 text-xs text-slate-500">{date(t.dueAt)}</p></div>)}{!customer.tasks.filter(t=>t.status!=="TAMAMLANDI").length&&<p className="text-sm text-slate-500">Açık görev yok.</p>}</div></div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Ticari akış</p><h2 className="mt-1 text-xl font-semibold">Gösterim · Teklif · Satış</h2></div><div className="flex flex-wrap gap-2"><Link href={"/sales/showing/new?customerId="+encodeURIComponent(id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">+ Gösterim</Link><Link href={"/sales/offer/new?customerId="+encodeURIComponent(id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">+ Teklif</Link></div></div><div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-400">Gösterimler</p>{customer.showings.slice(0,5).map(x=><Link key={x.id} href="/calendar" className="mt-3 block rounded-lg bg-white p-3"><p className="text-sm font-semibold">{x.listing.title}</p><p className="mt-1 text-xs text-slate-500">{x.listing.code} · {status[x.status]??x.status} · {date(x.dateTime)}</p></Link>)}{!customer.showings.length&&<p className="mt-3 text-sm text-slate-500">Yok.</p>}</div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-400">Teklifler</p>{offers.slice(0,5).map(x=><Link key={x.id} href="/sales" className="mt-3 block rounded-lg bg-white p-3"><div className="flex justify-between gap-2"><p className="truncate text-sm font-semibold">{x.listing.title}</p><span className="text-[11px]">{status[x.status]??x.status}</span></div><p className="mt-1 text-xs font-semibold">{money(x.amount,x.currency)}</p></Link>)}{!offers.length&&<p className="mt-3 text-sm text-slate-500">Yok.</p>}</div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-400">Satışlar</p>{sales.slice(0,5).map(x=><Link key={x.id} href={"/sales/"+x.id} className="mt-3 block rounded-lg bg-white p-3"><p className="text-sm font-semibold">{x.listing.title}</p><p className="mt-1 text-xs font-semibold">{money(x.amount,x.currency)}</p></Link>)}{!sales.length&&<p className="mt-3 text-sm text-slate-500">Yok.</p>}</div>
      </div></section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Müşteri geçmişi</p><h2 className="mt-1 text-xl font-semibold">Son 20 ticari/iletişim olayı</h2></div><Link href={"/relationships?customerId="+encodeURIComponent(id)} className="text-sm font-semibold text-slate-700">İlişkiler →</Link></div><div className="mt-4 space-y-2">{timeline.map(item=><div key={item.key} className="flex gap-3 rounded-xl bg-slate-50 p-3.5"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900"/><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.type}</span><span className="text-xs text-slate-400">{date(item.date)}</span></div><p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>{item.detail&&<p className="mt-1 text-xs text-slate-500">{item.detail}</p>}</div></div>)}{!timeline.length&&<p className="text-sm text-slate-500">Henüz geçmiş kaydı yok.</p>}</div></section>

      {customer.notes&&<section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Müşteri notu</p><p className="mt-2 text-sm leading-6 text-slate-700">{customer.notes}</p></section>}
      <p className="mt-5 text-xs text-slate-400">Sorumlu danışman: {customer.owner.name} · Kaynak: {customer.source||"Belirtilmemiş"} · Bu ekran mevcut yetki kapsamındaki müşteri verilerini kullanır.</p>
    </div>
  </main></div>;
}
