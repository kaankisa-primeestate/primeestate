"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const roleOptions = [
  ["ALICI", "Alıcı"], ["KIRACI", "Kiracı"], ["MAL_SAHIBI", "Mal Sahibi"],
  ["YATIRIMCI", "Yatırımcı"], ["LEAD", "Lead"],
];

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  roles: { role: string }[];
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/customers/" + encodeURIComponent(id), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Müşteri yüklenemedi.");
        if (active) setCustomer(data.customer);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Müşteri yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/customers/" + encodeURIComponent(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          location: form.get("location"),
          source: form.get("source"),
          notes: form.get("notes"),
          roles: form.getAll("roles").filter((x): x is string => typeof x === "string"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Müşteri güncellenemedi.");
      router.push("/clients");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Müşteri güncellenemedi.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={() => router.back()} className="mb-5 text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Müşteri detayına dön
          </button>
          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Müşteri</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Müşteriyi Düzenle</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Bilgileri tam sayfa düzenle. Kaydettiğinde müşteri ekranına dönersin.</p>
          </header>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Müşteri yükleniyor…</div> :
            customer ? <form onSubmit={submit} className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="space-y-4">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Ad Soyad *</span><input name="name" required defaultValue={customer.name} autoFocus className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="text-sm font-semibold text-slate-700">Telefon</span><input name="phone" type="tel" defaultValue={customer.phone ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                    <label className="block"><span className="text-sm font-semibold text-slate-700">E-posta</span><input name="email" type="email" defaultValue={customer.email ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="text-sm font-semibold text-slate-700">Konum</span><input name="location" defaultValue={customer.location ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                    <label className="block"><span className="text-sm font-semibold text-slate-700">Kaynak</span><input name="source" defaultValue={customer.source ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">Roller</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {roleOptions.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm"><input type="checkbox" name="roles" value={value} defaultChecked={customer.roles.some((role) => role.role === value)} />{label}</label>)}
                    </div>
                  </fieldset>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Not</span><textarea name="notes" rows={5} defaultValue={customer.notes ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                </div>
              </section>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Vazgeç</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button>
              </div>
            </form> : null}
        </div>
      </main>
    </div>
  );
}
