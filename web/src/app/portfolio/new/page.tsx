"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

function formatNumberInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("tr-TR").format(Number(digits));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        const maxWidth = 2000;
        const maxHeight = 2500;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Fotoğraf işlenemedi."));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("Fotoğraf okunamadı."));
      image.src = source;
    };
    reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
    reader.readAsDataURL(file);
  });
}

type Photo = { id: string; name: string; dataUrl: string };
type PrimeOpportunity = { customerId: string; customerName: string; score: number; reasons: string[]; mismatches: string[] };
type CreatedListing = { id: string; code: string; title: string; primeOpportunities: PrimeOpportunity[]; qualitySuggestions: string[] };

export default function NewPortfolioPage() {
  const router = useRouter();
  const [createPropertyType,setCreatePropertyType]=useState("DAIRE");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [createdListing,setCreatedListing]=useState<CreatedListing|null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [consultants,setConsultants]=useState<{ id: string; name: string; email: string; role: string; active: boolean }[]>([]);
  const [currentRole,setCurrentRole]=useState<string | null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const cameraInputRef=useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadConsultants = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setCurrentRole(data.currentUser?.role ?? null);
          setConsultants((data.users ?? []).filter((user: { role?: string; active?: boolean }) => user.role === "AGENT" && user.active));
        }
      } catch {
        // Consultant selection is additive; listing creation remains independent.
      }
    };
    void loadConsultants();
  }, []);

  async function handlePhotoFiles(files: FileList | null) {
    if (!files?.length) return;
    setPhotoBusy(true); setError("");
    try {
      const incoming: Photo[]=[];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        incoming.push({id:crypto.randomUUID(),name:file.name,dataUrl:await fileToDataUrl(file)});
      }
      setPhotos(current=>[...current,...incoming]);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Fotoğraf eklenemedi.");
    } finally { setPhotoBusy(false); }
  }

  async function createPortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    const detailKeys=["buildingAge","heating","bathrooms","furnished","balcony","parking","elevator","site","dues","facade","usageStatus","titleDeed","creditEligible","investmentSuitable","description","highlights","tags","landSize","pool","garden","zoning","parcel","island","kaks","taks","roadFrontage","commercialType","floorCount","totalFloors","units","period","season","siteName","term"];
    const details=Object.fromEntries(detailKeys.filter(key=>data[key]!==undefined&&String(data[key]).trim()!=="").map(key=>[key,String(data[key]).trim()]));
    try {
      const response=await fetch("/api/listings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,details})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.message||"Portföy eklenemedi.");
      const listingId=result.listing?.id;
      if(!listingId) throw new Error("Portföy kaydedildi ancak kayıt numarası alınamadı. Portföy listesini kontrol edin.");
      if(photos.length) {
        for(const photo of photos) {
          const imageResponse=await fetch("/api/listings/"+listingId+"/images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dataUrl:photo.dataUrl,alt:photo.name})});
          const imageResult=await imageResponse.json();
          if(!imageResponse.ok) throw new Error(imageResult.message||"Fotoğraflardan biri yüklenemedi.");
        }
      }
      const qualitySuggestions:string[]=[];
      if(!photos.length) qualitySuggestions.push("İlan fotoğrafları ekle.");
      if(!String(data.description??"").trim()) qualitySuggestions.push("İlan açıklamasını tamamla.");
      if(!String(data.highlights??"").trim()) qualitySuggestions.push("Öne çıkan özellikleri belirt.");
      if(!String(data.sizeM2??"").trim()) qualitySuggestions.push("Net m² bilgisini ekle.");
      if(!String(data.rooms??"").trim() && ["DAIRE","VILLA"].includes(createPropertyType)) qualitySuggestions.push("Oda bilgisini ekle.");
      if(!String(data.ownerName??"").trim()) qualitySuggestions.push("Mal sahibi bilgisini tamamla.");
      if(!String(data.address??"").trim()) qualitySuggestions.push("Açık adres bilgisini tamamla.");
      const primeOpportunities:PrimeOpportunity[]=(result.primeOpportunities??[]).map((item:{customerId:string;customerName:string;score:number;reasons?:unknown[];mismatches?:string[]})=>({
        customerId:item.customerId, customerName:item.customerName, score:item.score,
        reasons:(item.reasons??[]).map(reason=>typeof reason==="string"?reason:reason&&typeof reason==="object"&&"title" in reason?String((reason as {title?:unknown}).title??""):"").filter(Boolean),
        mismatches:item.mismatches??[],
      }));
      setCreatedListing({id:listingId,code:String(result.listing?.code??""),title:String(result.listing?.title??data.title??""),primeOpportunities,qualitySuggestions});
      setSaving(false);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Portföy eklenemedi.");
      setSaving(false);
    }
  }

  return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar/><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><button type="button" onClick={()=>router.back()} className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">← Portföylere dön</button><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">PrimeEstate Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Yeni Portföy</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Portföy ve ilan kaydı tek sayfada oluşturulur. Fotoğrafları da aynı işlemde ekleyebilirsin.</p></div>
    </header>
    {error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {photoBusy&&<div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Fotoğraflar hazırlanıyor…</div>}
    {createdListing ? <section className="space-y-5">\n      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">PrimeEstate · Portföy kaydedildi</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">{createdListing.title}</h2><p className="mt-1 text-sm text-slate-500">{createdListing.code}</p><p className="mt-4 text-sm leading-6 text-slate-700">{createdListing.primeOpportunities.length ? "Prime bu portföy için mevcut müşteri taleplerini taradı ve aşağıdaki fırsatları buldu." : "Portföy kaydedildi. Şu an eşleşen müşteri fırsatı bulunmadı; yeni talepler geldikçe yeniden değerlendirilebilir."}</p></div>\n      {createdListing.primeOpportunities.length>0 && <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Prime · Uygun müşteri fırsatları</p><div className="mt-3 space-y-3">{createdListing.primeOpportunities.slice(0,5).map(item=><div key={item.customerId} className="rounded-xl bg-white/10 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.customerName}</p><p className="mt-1 text-xs text-slate-300">%{item.score} eşleşme</p></div><Link href={"/clients/"+encodeURIComponent(item.customerId)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950">Müşteriyi aç →</Link></div>{item.reasons.length>0&&<ul className="mt-3 space-y-1 text-xs text-slate-300">{item.reasons.slice(0,3).map(reason=><li key={reason}>• {reason}</li>)}</ul>}{item.mismatches.length>0&&<p className="mt-2 text-xs text-amber-200">Kontrol edilecek noktalar: {item.mismatches.slice(0,2).join(", ")}</p>}</div>)}</div></div>}\n      {createdListing.qualitySuggestions.length>0&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold text-amber-950">İlanı güçlendirmek için tamamlanabilecekler</h3><p className="mt-1 text-sm text-amber-900">Bunlar kayıt hatası değil; portföyün sunumunu ve eşleştirme kalitesini iyileştirebilecek eksikler.</p><ul className="mt-3 space-y-2 text-sm text-amber-950">{createdListing.qualitySuggestions.map(item=><li key={item}>• {item}</li>)}</ul></div>}\n      <div className="flex flex-col gap-2 sm:flex-row"><Link href="/portfolio" className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white">Portföylere dön</Link><button type="button" onClick={()=>router.push("/portfolio/new")} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Yeni portföy ekle</button></div>\n    </section> : <form onSubmit={createPortfolio} className="w-full"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Yeni portföy</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Portföy ekle</h2><p className="mt-1 text-sm text-slate-500">Portföy ve ilan kaydı tek adımda oluşturulur.</p></div><button type="button" onClick={()=>router.back()} className="rounded-lg px-2 py-1 text-xl text-slate-400">×</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Başlık *</span><input name="title" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlan amacı *</span><select name="purpose" defaultValue="SATILIK" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="SATILIK">Satılık</option><option value="KIRALIK">Kiralık</option></select></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Portföy tipi *</span><select name="propertyType" value={createPropertyType} onChange={(e)=>setCreatePropertyType(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="DAIRE">Daire</option><option value="VILLA">Villa</option><option value="ARSA">Arsa</option><option value="IS_YERI">İş Yeri</option><option value="BINA">Bina</option><option value="DEVRE_MULK">Devre Mülk</option></select></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Fiyat *</span><input name="price" required inputMode="numeric" onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Para birimi</span><select name="currency" defaultValue="TRY" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option></select></label>
{["SUPER_ADMIN","ORG_ADMIN","OFFICE_ADMIN"].includes(currentRole ?? "") ? <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Sorumlu danışman</span><select name="consultantUserId" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Benim portföyüm</option>{consultants.map(consultant=><option key={consultant.id} value={consultant.id}>{consultant.name || consultant.email}</option>)}</select><span className="mt-1 block text-[11px] text-slate-400">Ofis yönetimi başka aktif danışmana atayabilir.</span></label> : null}<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İl *</span><input name="city" required defaultValue="İstanbul" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlçe *</span><input name="district" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mahalle *</span><input name="neighborhood" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Net m²</span><input name="sizeM2" inputMode="numeric" onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Oda</span><input name="rooms" placeholder="3+1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kat</span><input name="floor" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mal sahibi</span><input name="ownerName" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Adres</span><input name="address" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
<p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Portföy tipine özel bilgiler</p>
<p className="mt-1 text-xs text-slate-500">Seçtiğin gayrimenkul tipine göre gerekli alanlar burada açılır.</p>
<div className="mt-4 grid gap-4 sm:grid-cols-2">
{createPropertyType==="DAIRE" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Bina yaşı *</span><input name="buildingAge" type="number" min="0" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Isıtma *</span><select name="heating" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Seçiniz</option><option>Doğalgaz</option><option>Merkezi</option><option>Yerden ısıtma</option><option>Klima</option><option>Diğer</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Banyo</span><input name="bathrooms" type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Eşyalı</span><select name="furnished" defaultValue="Hayır" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>Hayır</option><option>Evet</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Balkon</span><select name="balcony" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Otopark</span><select name="parking" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Açık</option><option>Kapalı</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Asansör</span><select name="elevator" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Site</span><select name="site" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Aidat</span><input name="dues" inputMode="numeric" onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} placeholder="5.000" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Cephe</span><input name="facade" placeholder="Güney, doğu..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kullanım durumu</span><input name="usageStatus" placeholder="Boş, kiracılı, mal sahibi oturuyor..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Tapu durumu</span><input name="titleDeed" placeholder="Kat mülkiyeti..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Krediye uygun</span><select name="creditEligible" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Evet</option><option>Hayır</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Yatırıma uygun</span><select name="investmentSuitable" defaultValue="" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Evet</option><option>Hayır</option></select></label>
</> : null}
{createPropertyType==="VILLA" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Arsa m² *</span><input name="landSize" required type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Isıtma *</span><input name="heating" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Havuz</span><select name="pool" defaultValue="Yok" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>Yok</option><option>Var</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Bahçe</span><select name="garden" defaultValue="Yok" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>Yok</option><option>Var</option></select></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Otopark</span><select name="parking" defaultValue="Yok" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>Yok</option><option>Var</option></select></label>
</> : null}
{createPropertyType==="ARSA" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İmar durumu *</span><input name="zoning" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Ada</span><input name="island" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Parsel</span><input name="parcel" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">KAKS / Emsal</span><input name="kaks" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">TAKS</span><input name="taks" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Yol cephesi (m)</span><input name="roadFrontage" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
</> : null}
{createPropertyType==="IS_YERI" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İş yeri türü *</span><input name="commercialType" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kat sayısı</span><input name="floorCount" type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Isıtma</span><input name="heating" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
</> : null}
{createPropertyType==="BINA" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Arsa m² *</span><input name="landSize" required type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Toplam kat *</span><input name="totalFloors" required type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Bağımsız bölüm</span><input name="units" type="number" min="1" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Bina yaşı</span><input name="buildingAge" type="number" min="0" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
</> : null}
{createPropertyType==="DEVRE_MULK" ? <>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Dönem *</span><input name="period" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Sezon *</span><input name="season" required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Tesis</span><input name="siteName" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kullanım süresi</span><input name="term" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
</> : null}
<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlan açıklaması</span><textarea name="description" rows={4} placeholder="Detaylı açıklama..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Öne çıkan özellikler</span><input name="highlights" placeholder="Deniz manzarası, kapalı otopark, metroya yakın..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Arama etiketleri</span><input name="tags" placeholder="otopark, balkon, yatırım..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Portföy fotoğrafları</p>
  <p className="mt-1 text-xs text-slate-500">İlanı kaydederken fotoğrafları da ekleyebilirsin. Telefonunda kamera veya galeri, bilgisayarda dosya seçimi açılır.</p>
  <div className="mt-4 flex flex-wrap gap-2">
    <button type="button" onClick={()=>fileInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">📁 Galeriden / Dosyadan Ekle</button>
    <button type="button" onClick={()=>cameraInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">📷 Kameradan Çek</button>
  </div>
  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>void handlePhotoFiles(e.target.files)}/>
  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>void handlePhotoFiles(e.target.files)}/>
  {photos.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo,index)=><div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><img src={photo.dataUrl} alt={photo.name} className="h-full w-full object-cover"/><button type="button" onClick={()=>setPhotos(current=>current.filter(item=>item.id!==photo.id))} className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs font-bold text-white">×</button><span className="absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] text-white">{index+1}</span></div>)}</div>}
</div><div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-white/95 py-4 backdrop-blur"><button type="button" onClick={()=>router.back()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button disabled={saving} type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Kaydediliyor…":"Portföyü Kaydet"}</button></div></form>}\n  </div></main></div>;
}
