"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

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

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return null; }
}

export default function PortfolioEditModal({ item, onClose, onSaved }: { item: Listing; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadFile(file: File) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      throw new Error("Fotoğraf yükleme ayarı eksik. Cloudinary Cloud Name ve Upload Preset Render ortamına eklenmeli.");
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(file.name + ": JPG, PNG, WEBP veya HEIC/HEIF fotoğraf seçin.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(file.name + ": Fotoğraf 15 MB'dan küçük olmalı.");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);

    const response = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloudName) + "/image/upload", {
      method: "POST",
      body: form,
    });
    const payload = await readJson(response);
    if (!response.ok || typeof payload?.secure_url !== "string") {
      const errorMessage = typeof payload?.error === "object" && payload.error && "message" in payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : "Cloudinary fotoğraf yüklemesi başarısız.";
      throw new Error(errorMessage);
    }

    const saveResponse = await fetch("/api/listings/" + item.id + "/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: payload.secure_url, alt: item.title }),
    });
    const savePayload = await readJson(saveResponse);
    if (!saveResponse.ok) {
      throw new Error(typeof savePayload?.message === "string" ? savePayload.message : "Fotoğraf portföye kaydedilemedi.");
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const remaining = Math.max(0, 30 - item.images.length);
    if (remaining === 0) {
      setMessage("Bir portföy için en fazla 30 fotoğraf eklenebilir.");
      return;
    }
    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      setMessage("30 fotoğraf sınırı nedeniyle yalnızca ilk " + remaining + " fotoğraf seçildi.");
    } else {
      setMessage("");
    }

    setUploading(true);
    setSaving(true);
    try {
      for (let index = 0; index < selected.length; index += 1) {
        setUploadProgress((index + 1) + " / " + selected.length + " fotoğraf yükleniyor…");
        await uploadFile(selected[index]);
      }
      setUploadProgress("");
      await onSaved();
    } catch (error) {
      setUploadProgress("");
      setMessage(error instanceof Error ? error.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
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
            <p className="mt-1 text-sm text-slate-500">Telefondan galeriden seçin veya kamerayla doğrudan çekin.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{item.images.length} / 30 fotoğraf</span>
        </div>

        <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={handleFiles} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={handleFiles} className="hidden" />

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" disabled={saving} onClick={()=>galleryInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">🖼️ Galeriden Seç</button>
          <button type="button" disabled={saving} onClick={()=>cameraInputRef.current?.click()} className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">📷 Kamera</button>
          <button type="button" disabled={saving} onClick={()=>void addImage()} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">🔗 URL ile Ekle</button>
        </div>

        <div className="mt-3 flex gap-2">
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Harici fotoğraf URL'si (isteğe bağlı)" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm"/>
          <button type="button" disabled={saving || !imageUrl.trim()} onClick={()=>void addImage()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Ekle</button>
        </div>

        {uploading && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">{uploadProgress}</div>}
        <p className="mt-3 text-xs leading-5 text-slate-400">Dosya yükleme Cloudinary üzerinden doğrudan yapılır; PrimeEstate yalnızca güvenli fotoğraf adresini kaydeder. Her fotoğraf en fazla 15 MB olabilir.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {item.images.map(image=><div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><img src={image.url} alt={image.alt || item.title} className="h-full w-full object-cover"/><button type="button" disabled={saving} onClick={()=>void removeImage(image.id)} className="absolute right-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">Sil</button></div>)}
        </div>
      </div>
    </div>
  </div>;
}
