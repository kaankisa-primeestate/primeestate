"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Sidebar from "@/components/Sidebar";
import PortfolioEditModal from "@/components/PortfolioEditModal";
type ApiListing = {
  id: string; code: string; title: string; purpose: string; status: string;
  price: string | number; currency: string; tags: unknown; highlights: unknown;
  listedAt: string; updatedAt: string;
  property: { id: string; propertyType: string; city: string; district: string; neighborhood: string;
    address: string | null; sizeM2: string | number | null; rooms: string | null; floor: string | null; ownerName: string | null };
  consultant: { id: string; name: string; email: string } | null;
  _count: { matches: number; showings: number; offers: number };
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
};

const typeFilters = ["Tümü", "Daire", "Villa", "Arsa", "İş Yeri", "Bina"] as const;
const purposeFilters = ["Tümü", "Satılık", "Kiralık"] as const;
const typeMap: Record<string,string> = { DAIRE:"Daire", VILLA:"Villa", ARSA:"Arsa", IS_YERI:"İş Yeri", BINA:"Bina", DEVRE_MULK:"Devre Mülk" };
const purposeMap: Record<string,string> = { SATILIK:"Satılık", KIRALIK:"Kiralık" };
const statusMap: Record<string,string> = { AKTIF:"Aktif", REZERVE:"Rezerve", PASIF:"Pasif", SATILDI:"Satıldı", KIRALANDI:"Kiralandı" };
function money(value: string | number, currency: string) { return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Number(value)) + " " + currency; }
function arr(value: unknown) { return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; }
function displayDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value)); }



function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{statusMap[status] ?? status}</span>;
}
function PortfolioCard({ item, selected, onSelect }: { item: ApiListing; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={"w-full overflow-hidden rounded-2xl border text-left transition " + (selected ? "border-slate-400 bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm")}>
    <div className="h-36 overflow-hidden bg-slate-100">{item.images[0] ? <img src={item.images[0].url} alt={item.images[0].alt || item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl">🏡</div>}</div>
    <div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold tracking-wide text-slate-400">{item.code}</span><StatusBadge status={item.status} /></div>
    <h3 className="mt-2 line-clamp-2 font-semibold leading-5 text-slate-950">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.property.neighborhood} · {item.property.district}</p>
    <div className="mt-4 flex items-end justify-between gap-3"><p className="font-semibold text-slate-900">{money(item.price,item.currency)}</p><p className="text-xs text-slate-400">{item.property.sizeM2 ? item.property.sizeM2 + " m²" : "m² belirtilmemiş"}</p></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{arr(item.tags).slice(0,2).map(tag=><span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">{tag}</span>)}</div></div>
  </button>;
}
function Detail({ item, onEdit }: { item: ApiListing; onEdit: () => void }) {
  const facts = [["Fiyat",money(item.price,item.currency)],["m²",item.property.sizeM2 ? item.property.sizeM2 + " m²" : "—"],["Oda",item.property.rooms || "—"],["Kat",item.property.floor || "—"]];
  return <section className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold tracking-wide text-slate-400">{item.code}</span><StatusBadge status={item.status}/><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{purposeMap[item.purpose] ?? item.purpose}</span></div>
    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.property.city} · {item.property.district} · {item.property.neighborhood}</p></div>
    <div className="flex gap-2"><button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Düzenle</button><button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">İlanı Görüntüle</button></div></div>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{facts.map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}</div>
    <div className="mt-5 flex flex-wrap gap-2">{arr(item.highlights).map(h=><span key={h} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">{h}</span>)}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Portföy fotoğrafları</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{item.images.length ? item.images.map(image=><div key={image.id} className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt || item.title} className="h-full w-full object-cover" /></div>) : <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Henüz fotoğraf eklenmemiş. Düzenle ekranından ekleyebilirsiniz.</div>}</div></div>\n    <div className="grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mülkiyet & sorumluluk</p><div className="mt-4 space-y-3">
      {[["Mal sahibi",item.property.ownerName || "Belirtilmemiş"],["Sorumlu danışman",item.consultant?.name || "Atanmamış"],["Portföy tarihi",displayDate(item.listedAt)],["Son güncelleme",displayDate(item.updatedAt)]].map(([label,value])=><div key={label} className="flex justify-between gap-4"><span className="text-sm text-slate-500">{label}</span><span className="text-right text-sm font-semibold text-slate-800">{value}</span></div>)}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Eşleştirme hazırlığı</p><div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-semibold text-slate-950">{item._count.matches}</p><p className="mt-1 text-sm text-slate-500">eşleşme kaydı</p></div><span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{item._count.showings} gösterim</span></div>
    <p className="mt-4 text-sm leading-6 text-slate-500">Portföy artık gerçek Property + Listing kayıtlarından geliyor. Bir sonraki aşamada talep eşleştirme motoru bu kayıtları puanlayacak.</p></div></div>
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime’ın portföy özeti · V1</p><p className="mt-2 text-sm leading-6 text-slate-200">Bu ekran artık seed portföyler yerine yetkili gerçek ofis portföylerini kullanıyor.</p></div>
  </section>;
}

export default function PortfolioPage() {
  const [items,setItems]=useState<ApiListing[]>([]);
  const [consultants,setConsultants]=useState<{ id: string; name: string; email: string; role: string; active: boolean }[]>([]);
  const [currentRole,setCurrentRole]=useState<string | null>(null);
  const [primeNotice,setPrimeNotice]=useState<{ customerId: string; customerName: string; phone: string | null; score: number; listingId: string }[]>([]);
  const [primeOutcome,setPrimeOutcome]=useState("");
  const [primeDueAt,setPrimeDueAt]=useState("");
  const [primeShowingAt,setPrimeShowingAt]=useState("");
  const [primeConfirmationUrl,setPrimeConfirmationUrl]=useState<string|null>(null);
  const [primeBusy,setPrimeBusy]=useState("");
  const [primeSuccess,setPrimeSuccess]=useState("");
  const [query,setQuery]=useState(""); const [purpose,setPurpose]=useState<(typeof purposeFilters)[number]>("Tümü"); const [type,setType]=useState<(typeof typeFilters)[number]>("Tümü"); const [selectedId,setSelectedId]=useState<string|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [showCreate,setShowCreate]=useState(false); const [showEdit,setShowEdit]=useState(false); const [saving,setSaving]=useState(false);
  async function loadConsultants() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setCurrentRole(data.currentUser?.role ?? null);
        setConsultants((data.users ?? []).filter((user: { role?: string; active?: boolean }) => user.role === "AGENT" && user.active));
      }
    } catch {
      // Consultant selection is additive; listing loading remains independent.
    }
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const p=new URLSearchParams(); if(query.trim()) p.set("q",query.trim()); if(purpose!=="Tümü") p.set("purpose",Object.entries(purposeMap).find(([,v])=>v===purpose)?.[0] ?? ""); if(type!=="Tümü") p.set("propertyType",Object.entries(typeMap).find(([,v])=>v===type)?.[0] ?? "");
      const res=await fetch("/api/listings?"+p.toString(),{cache:"no-store"}); const data=await res.json(); if(!res.ok) throw new Error(data.message||"Portföyler yüklenemedi."); const next:ApiListing[]=data.listings??[]; setItems(next); setSelectedId(cur=>cur&&next.some(x=>x.id===cur)?cur:next[0]?.id??null);
    } catch(e){setError(e instanceof Error?e.message:"Portföyler yüklenemedi.");} finally{setLoading(false);}
  }
  useEffect(()=>{const t=window.setTimeout(()=>void load(),250);return()=>window.clearTimeout(t);},[query,purpose,type]);
  useEffect(()=>{void loadConsultants();},[]);
  async function createPortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/listings", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
      const payload = await res.json(); if(!res.ok) throw new Error(payload.message || "Portföy eklenemedi.");
      setShowCreate(false); form.reset(); await load(); setSelectedId(payload.listing?.id ?? null);
      setPrimeNotice(Array.isArray(payload.primeOpportunities) ? payload.primeOpportunities.slice(0, 5).map((item: { customerId?: string; customerName?: string; phone?: string | null; score?: number }) => ({ customerId: item.customerId ?? "", customerName: item.customerName ?? "Müşteri", phone: item.phone ?? null, score: Number(item.score ?? 0), listingId: payload.listing?.id ?? "" })).filter((item: { customerId: string }) => item.customerId) : []);
      setPrimeOutcome("");
      setPrimeDueAt("");
      setPrimeSuccess("");
    } catch(e) { setError(e instanceof Error ? e.message : "Portföy eklenemedi."); } finally { setSaving(false); }
  }
  async function handlePrimeListingAction(item: { customerId: string; customerName: string; phone: string | null; score: number; listingId: string }, action: "ARAMA" | "WHATSAPP", destination: "call" | "whatsapp") {
    const key=item.customerId+"-"+action;
    setPrimeBusy(key); setPrimeSuccess(""); setError("");
    try {
      const res=await fetch("/api/prime/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:item.customerId,listingId:item.listingId,action,outcome:primeOutcome.trim()||null})});
      const data=await res.json(); if(!res.ok) throw new Error(data.message||"Prime aksiyonu kaydedilemedi.");
      setPrimeOutcome("");
      setPrimeSuccess(item.customerName+" için portföy aksiyonu kaydedildi. Prime yeni adımı: "+data.nextAction.label);
      if(destination==="call" && item.phone) window.open("tel:"+item.phone,"_self");
      if(destination==="whatsapp" && item.phone) {
        const text="Merhaba "+item.customerName+", PrimeEstate'te sizin için uygun olduğunu düşündüğümüz "+(data.listing?.title||"portföy")+" ilanını paylaşmak istedim. Uygunsanız detayları konuşalım.";
        window.open("https://wa.me/"+item.phone.replace(/\D/g,"").replace(/^0/,"90")+"?text="+encodeURIComponent(text),"_blank","noopener,noreferrer");
      }
    } catch(e) { setError(e instanceof Error?e.message:"Prime aksiyonu kaydedilemedi."); }
    finally { setPrimeBusy(""); }
  }
  async function handlePrimeListingShowing(item: { customerId: string; customerName: string; phone: string | null; score: number; listingId: string }) {
    if (!primeShowingAt) { setError("Gösterim için tarih ve saat seç."); return; }
    const key=item.customerId+"-SHOWING"; setPrimeBusy(key); setPrimeSuccess(""); setPrimeConfirmationUrl(null); setError("");
    try {
      const res=await fetch("/api/prime/showing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:item.customerId,listingId:item.listingId,dateTime:new Date(primeShowingAt).toISOString()})});
      const data=await res.json(); if(!res.ok) throw new Error(data.message||"Gösterim oluşturulamadı.");
      setPrimeShowingAt(""); setPrimeConfirmationUrl(data.confirmation?.whatsappUrl??null);
      setPrimeSuccess(item.customerName+" için gösterim planlandı. Prime teyit görevini oluşturdu ve sonraki adımı ayarladı.");
    } catch(e) { setError(e instanceof Error?e.message:"Gösterim oluşturulamadı."); }
    finally { setPrimeBusy(""); }
  }
  async function handlePrimeListingTask(item: { customerId: string; customerName: string; phone: string | null; score: number; listingId: string }) {
    if(!primeDueAt){setError("Görev için tarih ve saat seç.");return;}
    const key=item.customerId+"-TASK"; setPrimeBusy(key); setPrimeSuccess(""); setError("");
    try {
      const res=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:item.customerId,title:"Prime: "+item.customerName+" için portföy takibi",dueAt:new Date(primeDueAt).toISOString(),priority:"YUKSEK",source:"PRIME_BRAIN_PROACTIVE_LISTING"})});
      const data=await res.json(); if(!res.ok) throw new Error(data.message||"Görev oluşturulamadı.");
      setPrimeDueAt(""); setPrimeSuccess(item.customerName+" için portföy takip görevi oluşturuldu.");
    } catch(e) { setError(e instanceof Error?e.message:"Görev oluşturulamadı."); }
    finally { setPrimeBusy(""); }
  }
  const selected=useMemo(()=>items.find(x=>x.id===selectedId)??items[0]??null,[items,selectedId]);
  const activeCount=items.filter(x=>x.status==="AKTIF").length, saleCount=items.filter(x=>x.purpose==="SATILIK").length, rentCount=items.filter(x=>x.purpose==="KIRALIK").length, matchCount=items.reduce((s,x)=>s+x._count.matches,0);
  return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate Workspace</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Portföyler</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Gerçek ofis portföylerini, ilanlarını, sorumlu danışmanlarını ve eşleşme sinyallerini tek çalışma alanında yönetin.</p></div><button type="button" onClick={()=>setShowCreate(true)} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Yeni Portföy</button></div></header>{error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{primeNotice.length>0&&<div className="mb-5 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prime · Yeni portföy fırsatları</p>
  <p className="mt-1 text-sm text-slate-200">Prime bu portföy için uygun müşteri adaylarını buldu. Şimdi sonucu hafızaya alarak aksiyona geçebilirsin.</p>
  {primeSuccess&&<div className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">{primeSuccess}</div>}
  <div className="mt-3 grid gap-3 lg:grid-cols-2">
    {primeNotice.map((item)=><div key={item.customerId+item.score} className="rounded-2xl bg-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">{item.customerName}</p><p className="mt-1 text-xs text-slate-300">%{item.score} eşleşme</p></div>
        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">{item.phone ? "Telefon kayıtlı" : "Telefon yok"}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!item.phone || primeBusy===item.customerId+"-ARAMA"} onClick={()=>void handlePrimeListingAction(item,"ARAMA","call")} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{primeBusy===item.customerId+"-ARAMA"?"Kaydediliyor…":"📞 Ara"}</button>
        <button type="button" disabled={!item.phone || primeBusy===item.customerId+"-WHATSAPP"} onClick={()=>void handlePrimeListingAction(item,"WHATSAPP","whatsapp")} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{primeBusy===item.customerId+"-WHATSAPP"?"Kaydediliyor…":"WhatsApp'tan Gönder"}</button>
        <button type="button" disabled={primeBusy===item.customerId+"-TASK"} onClick={()=>void handlePrimeListingTask(item)} className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{primeBusy===item.customerId+"-TASK"?"Kaydediliyor…":"Görev Oluştur"}</button>
        <button type="button" disabled={primeBusy===item.customerId+"-SHOWING"} onClick={()=>void handlePrimeListingShowing(item)} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{primeBusy===item.customerId+"-SHOWING"?"Planlanıyor…":"Gösterim Planla"}</button>
      </div>
    </div>)}
  </div>
  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
    <input value={primeOutcome} onChange={e=>setPrimeOutcome(e.target.value)} placeholder="Temas sonucu… Örn. Portföyü beğendi, yarın görmek istiyor." className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none ring-1 ring-white/10 focus:ring-white/30"/>
    <input type="datetime-local" value={primeDueAt} onChange={e=>setPrimeDueAt(e.target.value)} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white ring-1 ring-white/10"/>
  </div>
  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
    <input type="datetime-local" value={primeShowingAt} onChange={e=>setPrimeShowingAt(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white ring-1 ring-white/10"/>
    {primeConfirmationUrl&&<a href={primeConfirmationUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 px-3 py-2.5 text-center text-xs font-semibold text-white">WhatsApp Teyit Gönder</a>}
  </div>
</div>}<section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Aktif Portföy",activeCount],["Satılık",saleCount],["Kiralık",rentCount],["Talep Eşleşmesi",matchCount]].map(([label,value])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>)}</section><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]"><section><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Portföy, mahalle, kod veya özellik ara..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"/><div className="flex gap-2 overflow-x-auto">{purposeFilters.map(item=><button key={item} type="button" onClick={()=>setPurpose(item)} className={"whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold "+(purpose===item?"bg-slate-900 text-white":"bg-slate-100 text-slate-500")}>{item}</button>)}</div></div><div className="mt-3 flex gap-2 overflow-x-auto">{typeFilters.map(item=><button key={item} type="button" onClick={()=>setType(item)} className={"whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold "+(type===item?"bg-slate-200 text-slate-900":"text-slate-500 hover:bg-slate-100")}>{item}</button>)}</div></div>{loading?<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Portföyler yükleniyor…</div>:<div className="mt-4 grid gap-4 sm:grid-cols-2">{items.map(item=><PortfolioCard key={item.id} item={item} selected={item.id===selected?.id} onSelect={()=>setSelectedId(item.id)}/>)}</div>}{!loading&&items.length===0&&<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Filtrelere uyan portföy bulunamadı.</div>}</section><div className="min-w-0">{selected&&<Detail item={selected} onEdit={()=>setShowEdit(true)}/>}</div></div></div></main>{showEdit&&selected&&<PortfolioEditModal item={selected} onClose={()=>setShowEdit(false)} onSaved={async()=>{await load();}}/>}{showCreate&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6"><form onSubmit={createPortfolio} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Yeni portföy</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Portföy ekle</h2><p className="mt-1 text-sm text-slate-500">Portföy ve ilan kaydı tek adımda oluşturulur.</p></div><button type="button" onClick={()=>setShowCreate(false)} className="rounded-lg px-2 py-1 text-xl text-slate-400">×</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Başlık *</span><input name="title" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlan amacı *</span><select name="purpose" defaultValue="SATILIK" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="SATILIK">Satılık</option><option value="KIRALIK">Kiralık</option></select></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Portföy tipi *</span><select name="propertyType" defaultValue="DAIRE" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="DAIRE">Daire</option><option value="VILLA">Villa</option><option value="ARSA">Arsa</option><option value="IS_YERI">İş Yeri</option><option value="BINA">Bina</option><option value="DEVRE_MULK">Devre Mülk</option></select></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Fiyat *</span><input name="price" required type="number" min="1" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Para birimi</span><select name="currency" defaultValue="TRY" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option></select></label>
{["SUPER_ADMIN","ORG_ADMIN","OFFICE_ADMIN"].includes(currentRole ?? "") ? <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Sorumlu danışman</span><select name="consultantUserId" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Benim portföyüm</option>{consultants.map(consultant=><option key={consultant.id} value={consultant.id}>{consultant.name || consultant.email}</option>)}</select><span className="mt-1 block text-[11px] text-slate-400">Ofis yönetimi başka aktif danışmana atayabilir.</span></label> : null}<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İl *</span><input name="city" required defaultValue="İstanbul" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlçe *</span><input name="district" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mahalle *</span><input name="neighborhood" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Net m²</span><input name="sizeM2" type="number" min="1" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Oda</span><input name="rooms" placeholder="3+1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kat</span><input name="floor" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mal sahibi</span><input name="ownerName" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Adres</span><input name="address" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button disabled={saving} type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Kaydediliyor…":"Portföyü Kaydet"}</button></div></form></div>}</div>;
}
