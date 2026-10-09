"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Customer={id:string;name:string};
type Listing={id:string;code:string;title:string;price:string|number;currency:string};
type Showing={id:string;status:string;note:string|null;dateTime:string;listing:{id:string}};

function localDateTimeValue(){
 const now=new Date();
 now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
 return now.toISOString().slice(0,16);
}

function OfferForm(){
 const router=useRouter(); const params=useSearchParams();
 const preCustomerId=params.get("customerId")??""; const preListingId=params.get("listingId")??"";
 const [customers,setCustomers]=useState<Customer[]>([]),[listings,setListings]=useState<Listing[]>([]),[showingFeedback,setShowingFeedback]=useState(""),[saving,setSaving]=useState(false),[error,setError]=useState("");
 useEffect(()=>{void Promise.all([
   fetch("/api/customers",{cache:"no-store"}).then(r=>r.json()).then(d=>setCustomers(d.customers??[])),
   fetch("/api/listings?status=AKTIF",{cache:"no-store"}).then(r=>r.json()).then(d=>setListings(d.listings??[])),
   preCustomerId ? fetch(`/api/showings?customerId=${encodeURIComponent(preCustomerId)}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{ const match=(d.showings??[] as Showing[]).filter((s:Showing)=>s.status==="GERCEKLESTI" && (!preListingId || s.listing.id===preListingId)).sort((a:Showing,b:Showing)=>new Date(b.dateTime).getTime()-new Date(a.dateTime).getTime())[0]; setShowingFeedback(match?.note??""); }) : Promise.resolve()
 ]).catch(()=>setError("Form verileri alınamadı."));},[preCustomerId,preListingId]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError("");const data=Object.fromEntries(new FormData(e.currentTarget).entries());try{const r=await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,amount:Number(data.amount)})});const d=await r.json();if(!r.ok)throw new Error(d.message??"Teklif oluşturulamadı.");router.push("/clients/"+encodeURIComponent(String(data.customerId)));}catch(err){setError(err instanceof Error?err.message:"Teklif oluşturulamadı.");setSaving(false);}}
 const selectedListing=listings.find(l=>l.id===preListingId);
 return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-3xl">
 <button type="button" onClick={()=>router.back()} className="mb-5 text-sm font-semibold text-slate-600">← İş Akışına dön</button>
 <header className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">İş Akışı · Teklif</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Yeni Teklif</h1><p className="mt-2 text-sm text-slate-500">Eşleşen müşteri ve portföy bağlamını koruyarak teklifi gerçek iş akışına kaydet.</p></header>
 {showingFeedback&&<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Son gösterim geri bildirimi</p><p className="mt-2 text-sm leading-6 text-slate-700">{showingFeedback}</p></div>}
 {error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
 <form onSubmit={submit} className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid gap-4 sm:grid-cols-2">
 <label className="block sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Müşteri *</span>{preCustomerId?<><input type="hidden" name="customerId" value={preCustomerId}/><div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900">{customers.find(c=>c.id===preCustomerId)?.name??"Müşteri yükleniyor…"}</div></>:<select required name="customerId" defaultValue="" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Müşteri seçin</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}</label>
 <label className="block sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Portföy *</span>{preListingId?<><input type="hidden" name="listingId" value={preListingId}/><div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900">{selectedListing?selectedListing.code+" · "+selectedListing.title:"Portföy yükleniyor…"}</div></>:<select required name="listingId" defaultValue="" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Portföy seçin</option>{listings.map(l=><option key={l.id} value={l.id}>{l.code} · {l.title}</option>)}</select>}</label>
 <label className="block"><span className="text-sm font-semibold text-slate-700">Teklif tutarı *</span><input required name="amount" type="number" min="0.01" step="0.01" key={selectedListing?.id??"listing-loading"} defaultValue={selectedListing?.price?Number(selectedListing.price):""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
 <label className="block"><span className="text-sm font-semibold text-slate-700">Para birimi</span><select name="currency" key={(selectedListing?.id??"listing-loading")+"-currency"} defaultValue={selectedListing?.currency??"TRY"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
 <label className="block sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Teklif tarihi</span><input required name="offeredAt" type="datetime-local" defaultValue={localDateTimeValue()} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
 <label className="block sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Sonraki aksiyon</span><input name="nextAction" placeholder="Örn. 2 gün sonra müşteriyle tekrar görüş" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
 </div></section><div className="flex justify-end gap-2"><button type="button" onClick={()=>router.back()} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Vazgeç</button><button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Kaydediliyor…":"Teklifi kaydet"}</button></div></form>
 </div></main></div>;
}

export default function NewSalesOfferPage(){
 return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-slate-500">Teklif formu yükleniyor…</main>}><OfferForm/></Suspense>;
}