"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConsultantApplicationPage() {
  const params = useSearchParams();
  const officeSlug = params.get("office") ?? "";
  const [office,setOffice]=useState<{name:string;organizationName:string}|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [submitted,setSubmitted]=useState(false);

  useEffect(()=>{ if(!officeSlug) return; void fetch("/api/consultant-applications?officeSlug="+encodeURIComponent(officeSlug)).then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.message); setOffice(d.office);}).catch(e=>setError(e instanceof Error?e.message:"Ofis bilgisi alınamadı.")); },[officeSlug]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form=new FormData(event.currentTarget);
    const password=String(form.get("password")||""); const confirm=String(form.get("passwordConfirm")||"");
    if(password!==confirm){setError("Şifreler aynı olmalıdır.");setLoading(false);return;}
    const payload=Object.fromEntries(form.entries());
    try{
      const r=await fetch("/api/consultant-applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,officeSlug})});
      const d=await r.json(); if(!r.ok) throw new Error(d.message||"Başvuru gönderilemedi.");
      setSubmitted(true);
    }catch(e){setError(e instanceof Error?e.message:"Başvuru gönderilemedi.");}finally{setLoading(false);}
  }

  if(!officeSlug) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8"><h1 className="text-2xl font-bold text-slate-950">Danışman Başvurusu</h1><p className="mt-3 text-sm leading-6 text-slate-500">Başvuru formu, ofis yöneticisinin size gönderdiği özel başvuru bağlantısı üzerinden açılır.</p><Link href="/login" className="mt-6 inline-block font-semibold text-slate-900 underline">Giriş sayfasına dön</Link></div></main>;

  if(submitted) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Başvuru alındı</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Başvurunuz gönderildi.</h1><p className="mt-3 text-sm leading-6 text-slate-500">Ofis yöneticiniz başvuruyu inceledikten sonra hesabınız aktif edilecek. Onaydan önce bu bilgilerle giriş yapamazsınız.</p><Link href="/login" className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Giriş sayfasına dön</Link></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <Link href="/login" className="text-sm font-semibold text-slate-500">← PrimeEstate girişine dön</Link>
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Danışman</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Danışman Başvurusu</h1>
      <p className="mt-2 text-sm text-slate-500">{office ? office.organizationName+" · "+office.name : "Ofis bilgisi yükleniyor…"}</p>
      {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="mt-8 space-y-7">
        <div><h2 className="font-semibold text-slate-900">Kişisel bilgiler</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input name="firstName" required placeholder="Ad" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="lastName" required placeholder="Soyad" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="tcIdentityNumber" required inputMode="numeric" maxLength={11} placeholder="T.C. Kimlik No" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="phone" required placeholder="Telefon" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="email" required type="email" placeholder="E-posta" className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2"/>
        </div></div>
        <div><h2 className="font-semibold text-slate-900">Şirket bilgileri</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input name="companyName" required placeholder="Şirket / işletme adı" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="companyTitle" placeholder="Şirket unvanı" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="companyTaxNumber" placeholder="Vergi no" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="companyPhone" placeholder="Şirket telefonu" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="companyEmail" type="email" placeholder="Şirket e-postası" className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2"/>
        </div></div>
        <div><h2 className="font-semibold text-slate-900">Komisyon modeli</h2><div className="mt-3 grid gap-4 sm:grid-cols-3">
          <select name="commissionModel" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-3"><option value="">Model seçin</option><option value="YUZDE">Yüzde paylaşımı</option><option value="MAKSIMUM">Maksimum / tavan model</option><option value="REP">REP / özel model</option></select>
          <input name="officeShareRate" type="number" min="0" max="100" step="0.01" placeholder="Ofis payı % (opsiyonel)" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="consultantShareRate" type="number" min="0" max="100" step="0.01" placeholder="Danışman payı % (opsiyonel)" className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2"/>
        </div><p className="mt-2 text-xs text-slate-400">Oranlar başvuru kaydında saklanır; satış oluştuğunda kullanılacak kesin hesaplama kuralları ayrıca tanımlanacaktır.</p></div>
        <div><h2 className="font-semibold text-slate-900">Giriş şifresi</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input name="password" required minLength={8} type="password" autoComplete="new-password" placeholder="Şifre" className="rounded-2xl border border-slate-200 px-4 py-3"/>
          <input name="passwordConfirm" required minLength={8} type="password" autoComplete="new-password" placeholder="Şifre tekrar" className="rounded-2xl border border-slate-200 px-4 py-3"/>
        </div></div>
        <button disabled={loading||!office} className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white disabled:opacity-50">{loading?"Gönderiliyor…":"Danışman Başvurusu Gönder"}</button>
      </form>
    </section>
  </div></main>;
}
