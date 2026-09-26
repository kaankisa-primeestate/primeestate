"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const roles = [
  ["ALICI", "Alıcı"],
  ["KIRACI", "Kiracı"],
  ["MAL_SAHIBI", "Mal Sahibi"],
  ["YATIRIMCI", "Yatırımcı"],
  ["LEAD", "Lead"],
];

const propertyTypes = [
  ["DAIRE", "Daire"],
  ["VILLA", "Villa"],
  ["ARSA", "Arsa"],
  ["IS_YERI", "İş Yeri"],
  ["BINA", "Bina"],
  ["DEVRE_MULK", "Devre Mülk"],
];

function numberValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : null;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const demandTitle = String(form.get("demandTitle") || "").trim();
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          location: form.get("location"),
          source: form.get("source"),
          notes: form.get("notes"),
          roles: form.getAll("roles").filter((x): x is string => typeof x === "string"),
          demand: demandTitle
            ? {
                title: demandTitle,
                type: form.get("demandType") || "SATIN_ALMA",
                propertyType: form.get("demandPropertyType") || "DAIRE",
                locations: String(form.get("demandLocations") || "")
                  .split(",").map((x) => x.trim()).filter(Boolean),
                budgetMin: numberValue(form.get("demandBudgetMin")),
                budgetMax: numberValue(form.get("demandBudgetMax")),
                currency: form.get("demandCurrency") || "TRY",
                minSize: numberValue(form.get("demandMinSize")),
                maxSize: numberValue(form.get("demandMaxSize")),
                rooms: form.get("demandRooms") || null,
                urgency: form.get("demandUrgency") || "NORMAL",
                notes: form.get("demandNotes") || null,
              }
            : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Müşteri oluşturulamadı.");

      router.push("/clients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Müşteri oluşturulamadı.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <button type="button" onClick={() => router.back()} className="mb-5 text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Müşterilere dön
          </button>

          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Müşteriler</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Yeni Müşteri</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Müşteri kaydını tam sayfa olarak oluştur. Kaydettiğinde müşteri listesine dönersin.
            </p>
          </header>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={submit} className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Temel müşteri bilgileri</p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Ad Soyad *</span>
                  <input name="name" required autoFocus className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Telefon</span><input name="phone" type="tel" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">E-posta</span><input name="email" type="email" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Konum</span><input name="location" placeholder="Örn. Bostancı" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Kaynak</span><input name="source" placeholder="WhatsApp, referans, web..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                </div>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">Roller</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {roles.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                        <input type="checkbox" name="roles" value={value} />{label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><textarea name="notes" rows={4} placeholder="Müşteri hakkında ek bilgiler..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">İlk talep · Opsiyonel</p>
              <p className="mt-1 text-xs text-slate-500">Talep başlığını doldurursan müşteriyle birlikte ilk talep de oluşturulur.</p>
              <div className="mt-5 space-y-4">
                <label className="block"><span className="text-sm font-semibold text-slate-700">Talep başlığı</span><input name="demandTitle" placeholder="Örn. Bostancı 3+1 satın alma" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Talep tipi</span><select name="demandType" defaultValue="SATIN_ALMA" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="SATIN_ALMA">Satın Alma</option><option value="KIRALAMA">Kiralama</option></select></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Gayrimenkul tipi</span><select name="demandPropertyType" defaultValue="DAIRE" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>
                <label className="block"><span className="text-sm font-semibold text-slate-700">Lokasyonlar</span><input name="demandLocations" placeholder="Bostancı, Suadiye, Kozyatağı" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Min. bütçe</span><input name="demandBudgetMin" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Max. bütçe</span><input name="demandBudgetMax" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Para birimi</span><select name="demandCurrency" defaultValue="TRY" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option>TRY</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Min. m²</span><input name="demandMinSize" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Max. m²</span><input name="demandMaxSize" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Oda</span><input name="demandRooms" placeholder="3+1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Aciliyet</span><select name="demandUrgency" defaultValue="NORMAL" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="YUKSEK">Yüksek</option><option value="NORMAL">Normal</option><option value="DUSUK">Düşük</option></select></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Talep notu</span><input name="demandNotes" placeholder="Örn. Otopark önemli" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Müşteri ve Bilgileri Kaydet"}</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
