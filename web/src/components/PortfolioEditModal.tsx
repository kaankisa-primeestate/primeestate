"use client";

import { useRef, useState, type FormEvent } from "react";

type Listing = {
  id: string;
  code: string;
  title: string;
  purpose: string;
  status: string;
  price: string | number;
  currency: string;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  property: {
    propertyType: string; city: string; district: string; neighborhood: string;
    address: string | null; sizeM2: string | number | null; rooms: string | null; floor: string | null; ownerName: string | null; details?: Record<string, unknown> | null;
  };
};

export default function PortfolioEditModal({ item, onClose, onSaved }: { item: Listing; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const details = item.property.details && typeof item.property.details === "object" ? item.property.details : {};
  const detail = (key: string) => typeof details[key] === "string" || typeof details[key] === "number" ? String(details[key]) : "";
  const formatNumberInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    return digits ? new Intl.NumberFormat("tr-TR").format(Number(digits)) : "";
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data: Record<string, unknown> = Object.fromEntries(formData.entries());
    const detailKeys = ["buildingAge","heating","bathrooms","furnished","balcony","parking","elevator","site","dues","facade","usageStatus","titleDeed","creditEligible","investmentSuitable","description","highlights","tags","landSize","pool","garden","zoning","parcel","island","kaks","taks","roadFrontage","commercialType","floorCount","totalFloors","units","period","season","siteName","term"];
    data.details = Object.fromEntries(detailKeys.filter((key) => data[key] !== undefined && String(data[key]).trim() !== "").map((key) => [key, String(data[key]).trim()]));
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/listings/" + item.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Portföy güncellenemedi.");
      await onSaved();
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Portföy güncellenemedi.");
    } finally { setSaving(false); }
  }

  async function addImage() {
    if (!imageUrl.trim()) return;
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/listings/" + item.id + "/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: imageUrl.trim() }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Fotoğraf eklenemedi.");
      setImageUrl("");
      await onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Fotoğraf eklenemedi."); }
    finally { setSaving(false); }
  }

  async function fileToDataUrl(file: File) {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Fotoğraf okunamadı."));
      image.src = URL.createObjectURL(file);
    });
    const maxWidth = 2000;
    const maxHeight = 2500;
    const scale = Math.min(1, maxWidth / source.naturalWidth, maxHeight / source.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işlenemedi.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadingImages(true); setSaving(true); setMessage("");
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Sadece fotoğraf dosyaları eklenebilir.");
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch("/api/listings/" + item.id + "/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, alt: item.title }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || "Fotoğraf eklenemedi.");
      }
      await onSaved();
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fotoğraf eklenemedi.");
    } finally {
      setUploadingImages(false); setSaving(false);
    }
  }

  async function removeImage(imageId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/listings/" + item.id + "/images?imageId=" + encodeURIComponent(imageId), { method: "DELETE" });
      if (!res.ok) { const payload = await res.json(); throw new Error(payload.message || "Fotoğraf silinemedi."); }
      await onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Fotoğraf silinemedi."); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Portföy düzenle</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">{item.code}</h2></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-400">×</button></div>
      {message && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}
      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Başlık *</span><input name="title" defaultValue={item.title} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Amaç</span><select name="purpose" defaultValue={item.purpose} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="SATILIK">Satılık</option><option value="KIRALIK">Kiralık</option></select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Durum</span><select name="status" defaultValue={item.status} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="AKTIF">Aktif</option><option value="REZERVE">Rezerve</option><option value="PASIF">Pasif</option><option value="SATILDI">Satıldı</option><option value="KIRALANDI">Kiralandı</option></select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Fiyat</span><input name="price" inputMode="numeric" defaultValue={new Intl.NumberFormat("tr-TR").format(Number(item.price))} onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Para birimi</span><select name="currency" defaultValue={item.currency} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option></select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İl</span><input name="city" defaultValue={item.property.city} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlçe</span><input name="district" defaultValue={item.property.district} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mahalle</span><input name="neighborhood" defaultValue={item.property.neighborhood} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">m²</span><input name="sizeM2" inputMode="numeric" defaultValue={item.property.sizeM2 ? new Intl.NumberFormat("tr-TR").format(Number(item.property.sizeM2)) : ""} onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Oda</span><input name="rooms" defaultValue={item.property.rooms ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kat</span><input name="floor" defaultValue={item.property.floor ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mal sahibi</span><input name="ownerName" defaultValue={item.property.ownerName ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Adres</span><input name="address" defaultValue={item.property.address ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Detaylar · Opsiyonel</p><div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Bina yaşı</span><input name="buildingAge" defaultValue={detail("buildingAge")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Isıtma</span><input name="heating" defaultValue={detail("heating")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Banyo</span><input name="bathrooms" defaultValue={detail("bathrooms")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Otopark</span><select name="parking" defaultValue={detail("parking")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Açık</option><option>Kapalı</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Balkon</span><select name="balcony" defaultValue={detail("balcony")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Asansör</span><select name="elevator" defaultValue={detail("elevator")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Site</span><select name="site" defaultValue={detail("site")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Yok</option><option>Var</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Aidat</span><input name="dues" inputMode="numeric" defaultValue={detail("dues")} onChange={(e)=>{e.currentTarget.value=formatNumberInput(e.currentTarget.value)}} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Cephe</span><input name="facade" defaultValue={detail("facade")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kullanım durumu</span><input name="usageStatus" defaultValue={detail("usageStatus")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Tapu durumu</span><input name="titleDeed" defaultValue={detail("titleDeed")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Krediye uygun</span><select name="creditEligible" defaultValue={detail("creditEligible")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Evet</option><option>Hayır</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Yatırıma uygun</span><select name="investmentSuitable" defaultValue={detail("investmentSuitable")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Belirtilmemiş</option><option>Evet</option><option>Hayır</option></select></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlan açıklaması</span><textarea name="description" defaultValue={detail("description")} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Öne çıkan özellikler</span><input name="highlights" defaultValue={detail("highlights")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Arama etiketleri</span><input name="tags" defaultValue={detail("tags")} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        </div></div>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button disabled={saving} type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button></div>
      </form>
      <div className="mt-7 border-t border-slate-200 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fotoğraf yönetimi</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={e=>void uploadFiles(e.target.files)} className="hidden"/>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e=>void uploadFiles(e.target.files)} className="hidden"/>
          <button type="button" disabled={saving} onClick={()=>galleryInputRef.current?.click()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">📁 Galeriden / Dosyadan Ekle</button>
          <button type="button" disabled={saving} onClick={()=>cameraInputRef.current?.click()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">📷 Kameradan Çek</button>
          <button type="button" disabled={saving} onClick={()=>void addImage()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">🔗 URL ile Ekle</button>
        </div>
        <div className="mt-3 flex gap-2">
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://... fotoğraf URL'si" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm"/>
          <button type="button" disabled={saving} onClick={()=>void addImage()} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Ekle</button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{uploadingImages ? "Fotoğraflar yükleniyor…" : "Telefonda galeri veya kamera, bilgisayarda dosya seçimi kullanılabilir. Birden fazla fotoğrafı aynı anda seçebilirsin."}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{item.images.map(image=><div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt || item.title} className="h-full w-full object-cover"/><button type="button" disabled={saving} onClick={()=>void removeImage(image.id)} className="absolute right-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">Sil</button></div>)}</div>
      </div>
    </div>
  </div>;
}
