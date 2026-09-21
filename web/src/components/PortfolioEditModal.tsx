"use client";

import { useState, type FormEvent } from "react";

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
    address: string | null; sizeM2: string | number | null; rooms: string | null; floor: string | null; ownerName: string | null;
  };
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return null; }
}

export default function PortfolioEditModal({ item, onClose, onSaved }: { item: Listing; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/listings/" + item.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await readJson(res);
      if (!res.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "Portföy güncellenemedi.");
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
      const payload = await readJson(res);
      if (!res.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "Fotoğraf eklenemedi.");
      setImageUrl("");
      await onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Fotoğraf eklenemedi."); }
    finally { setSaving(false); }
  }

  async function removeImage(imageId: string) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/listings/" + item.id + "/images?imageId=" + encodeURIComponent(imageId), { method: "DELETE" });
      if (!res.ok) { const payload = await readJson(res); throw new Error(typeof payload?.message === "string" ? payload.message : "Fotoğraf silinemedi."); }
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
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Fiyat</span><input name="price" type="number" min="1" step="0.01" defaultValue={item.price} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Para birimi</span><select name="currency" defaultValue={item.currency} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option></select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İl</span><input name="city" defaultValue={item.property.city} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">İlçe</span><input name="district" defaultValue={item.property.district} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mahalle</span><input name="neighborhood" defaultValue={item.property.neighborhood} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">m²</span><input name="sizeM2" type="number" min="1" step="0.01" defaultValue={item.property.sizeM2 ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Oda</span><input name="rooms" defaultValue={item.property.rooms ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Kat</span><input name="floor" defaultValue={item.property.floor ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mal sahibi</span><input name="ownerName" defaultValue={item.property.ownerName ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Adres</span><input name="address" defaultValue={item.property.address ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Vazgeç</button><button disabled={saving} type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button></div>
      </form>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fotoğraf yönetimi</p>
            <p className="mt-1 text-sm text-slate-500">Fotoğraf yükleme altyapısı sonraki aşamada bağlanacak.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{item.images.length} / 30 fotoğraf</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" disabled className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">🖼️ Galeriden Seç · Yakında</button>
          <button type="button" disabled className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">📷 Kamera · Yakında</button>
          <button type="button" disabled className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">☁️ Bulut yükleme · Yakında</button>
        </div>

        <div className="mt-3 flex gap-2">
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Harici fotoğraf URL'si (isteğe bağlı)" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm"/>
          <button type="button" disabled={saving || !imageUrl.trim()} onClick={()=>void addImage()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Ekle</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">URL ile ekleme mevcut. Galeri, kamera ve bulut depolama bağlantısı ayrı bir altyapı adımı olarak ele alınacak.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {item.images.map(image=><div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt || item.title} className="h-full w-full object-cover"/><button type="button" disabled={saving} onClick={()=>void removeImage(image.id)} className="absolute right-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">Sil</button></div>)}
        </div>
      </div>
    </div>
  </div>;
}
