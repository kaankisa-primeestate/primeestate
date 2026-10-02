"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const propertyTypes = [["DAIRE","Daire"],["VILLA","Villa"],["ARSA","Arsa"],["IS_YERI","İş Yeri"],["BINA","Bina"],["DEVRE_MULK","Devre Mülk"]];

type Demand = {
  id: string; title: string; type: string; propertyType: string; locations: unknown;
  budgetMin: string | number | null; budgetMax: string | number | null; currency: string;
  minSize: string | number | null; maxSize: string | number | null; rooms: string | null;
  urgency: string; preferences?: { mustHave?: string[]; preferred?: string[]; mustNotHave?: string[] } | null; notes: string | null;
};

export default function EditDemandPage() {
  const { id, demandId } = useParams<{ id: string; demandId: string }>();
  const router = useRouter();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers/" + encodeURIComponent(id), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Müşteri alınamadı.");
        const found = (data.customer?.demands ?? []).find((item: Demand) => item.id === demandId);
        if (!found) throw new Error("Talep bulunamadı.");
        setDemand(found);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Talep alınamadı."))
      .finally(() => setLoading(false));
  }, [id, demandId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/customers/" + encodeURIComponent(id) + "/demands/" + encodeURIComponent(demandId), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"), type: form.get("type"), propertyType: form.get("propertyType"),
          locations: String(form.get("locations") || "").split(",").map((x) => x.trim()).filter(Boolean),
          budgetMin: form.get("budgetMin") || null, budgetMax: form.get("budgetMax") || null,
          currency: form.get("currency") || "TRY", minSize: form.get("minSize") || null, maxSize: form.get("maxSize") || null,
          rooms: form.get("rooms"), urgency: form.get("urgency") || "NORMAL",
          preferences: {
            mustHave: String(form.get("mustHave") || "").split(",").map((x) => x.trim()).filter(Boolean),
            preferred: String(form.get("preferred") || "").split(",").map((x) => x.trim()).filter(Boolean),
            mustNotHave: String(form.get("mustNotHave") || "").split(",").map((x) => x.trim()).filter(Boolean),
          },
          notes: form.get("notes"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Talep güncellenemedi.");
      router.push("/clients"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Talep güncellenemedi."); setSaving(false); }
  }

  const prefs = demand?.preferences ?? {};
  const locations = Array.isArray(demand?.locations) ? demand.locations.filter((x): x is string => typeof x === "string").join(", ") : "";

  return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar /><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-4xl">
    <button type="button" onClick={() => router.back()} className="mb-5 text-sm font-semibold text-slate-600">← Müşteri detayına dön</button>
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Talep</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Talebi Düzenle</h1><p className="mt-2 text-sm text-slate-500">Müşterinin aradığı gayrimenkul kriterlerini güncelle.</p></header>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading || !demand ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{loading ? "Talep yükleniyor…" : "Talep bulunamadı."}</div> :
    <form onSubmit={submit} className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="space-y-4">
      <label className="block"><span className="text-sm font-semibold text-slate-700">Talep başlığı *</span><input name="title" required defaultValue={demand.title} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-slate-700">Talep tipi *</span><select name="type" defaultValue={demand.type} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="SATIN_ALMA">Satın Alma</option><option value="KIRALAMA">Kiralama</option></select></label><label className="block"><span className="text-sm font-semibold text-slate-700">Gayrimenkul tipi *</span><select name="propertyType" defaultValue={demand.propertyType} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{propertyTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label className="block"><span className="text-sm font-semibold text-slate-700">Lokasyonlar</span><input name="locations" defaultValue={locations} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="text-sm font-semibold text-slate-700">Min. bütçe</span><input name="budgetMin" defaultValue={demand.budgetMin ?? ""} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Max. bütçe</span><input name="budgetMax" defaultValue={demand.budgetMax ?? ""} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Para birimi</span><select name="currency" defaultValue={demand.currency} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option><option>GBP</option></select></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="text-sm font-semibold text-slate-700">Min. m²</span><input name="minSize" defaultValue={demand.minSize ?? ""} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Max. m²</span><input name="maxSize" defaultValue={demand.maxSize ?? ""} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Oda</span><input name="rooms" defaultValue={demand.rooms ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="text-sm font-semibold text-slate-700">Kesin olmalı</span><input name="mustHave" defaultValue={prefs.mustHave?.join(", ") ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Tercih edilir</span><input name="preferred" defaultValue={prefs.preferred?.join(", ") ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Kesin olmasın</span><input name="mustNotHave" defaultValue={prefs.mustNotHave?.join(", ") ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-slate-700">Aciliyet</span><select name="urgency" defaultValue={demand.urgency} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="YUKSEK">Yüksek</option><option value="NORMAL">Normal</option><option value="DUSUK">Düşük</option></select></label><label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><input name="notes" defaultValue={demand.notes ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label></div>
    </div></section><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Vazgeç</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Talebi Güncelle"}</button></div></form>}
  </div></main></div>;
}
