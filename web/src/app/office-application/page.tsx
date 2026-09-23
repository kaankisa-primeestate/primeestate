"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OfficeApplicationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ officeName:"", ownerFirstName:"", ownerLastName:"", ownerPhone:"", ownerEmail:"", password:"", passwordConfirm:"" });
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);

  function update(key:string,value:string){setForm((current)=>({...current,[key]:value}));}

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if(form.password!==form.passwordConfirm){setError("Şifreler aynı olmalıdır.");return;}
    setLoading(true);
    try{
      const response=await fetch("/api/platform/office-applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.message||"Başvuru gönderilemedi.");
      router.push("/office-application/success");
    }catch(e){setError(e instanceof Error?e.message:"Başvuru gönderilemedi.");}finally{setLoading(false);}
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-2xl">
      <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900">← PrimeEstate girişine dön</Link>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Ofis Başvurusu</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Ofisinizi PrimeEstate'e bağlamak için önce temel bilgileri gönderin. Başvurunuz PrimeEstate tarafından incelenir.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div><h2 className="font-semibold text-slate-900">Ofis</h2>
            <label className="mt-3 block text-sm font-medium text-slate-700">Ofis adı<input required value={form.officeName} onChange={e=>update("officeName",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>
          <div><h2 className="font-semibold text-slate-900">Ofis sahibi / yetkili</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Ad<input required value={form.ownerFirstName} onChange={e=>update("ownerFirstName",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
              <label className="text-sm font-medium text-slate-700">Soyad<input required value={form.ownerLastName} onChange={e=>update("ownerLastName",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Telefon<input required value={form.ownerPhone} onChange={e=>update("ownerPhone",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
              <label className="text-sm font-medium text-slate-700">E-posta<input required type="email" value={form.ownerEmail} onChange={e=>update("ownerEmail",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
            </div>
          </div>
          <div><h2 className="font-semibold text-slate-900">Giriş şifresi</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Şifre<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={e=>update("password",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
              <label className="text-sm font-medium text-slate-700">Şifre tekrar<input required minLength={8} type="password" autoComplete="new-password" value={form.passwordConfirm} onChange={e=>update("passwordConfirm",e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
            </div>
            <p className="mt-2 text-xs text-slate-400">Şifreniz veritabanında düz metin olarak saklanmaz.</p>
          </div>
          {error&&<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white disabled:opacity-60">{loading?"Gönderiliyor…":"Ofis Başvurusu Gönder"}</button>
        </form>
      </section>
    </div>
  </main>;
}
