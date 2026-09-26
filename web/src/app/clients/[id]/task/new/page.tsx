"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function NewTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id, title: form.get("title"), dueAt: form.get("dueAt") ? new Date(String(form.get("dueAt"))).toISOString() : "", priority: form.get("priority"), source: "CUSTOMER_DETAIL" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Görev oluşturulamadı.");
      router.push("/clients"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Görev oluşturulamadı."); setSaving(false); }
  }

  return <div className="min-h-screen bg-slate-50 md:flex"><Sidebar /><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-3xl">
    <button type="button" onClick={() => router.back()} className="mb-5 text-sm font-semibold text-slate-600">← Müşteri detayına dön</button>
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CRM · Takip</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Yeni Görev</h1><p className="mt-2 text-sm text-slate-500">Müşteri için yapılacak işi ve son tarihini kaydet.</p></header>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="space-y-4">
      <label className="block"><span className="text-sm font-semibold text-slate-700">Görev *</span><input name="title" required autoFocus placeholder="Örn. Cuma günü müşteriyi ara" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-slate-700">Son tarih *</span><input name="dueAt" required type="datetime-local" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Öncelik</span><select name="priority" defaultValue="NORMAL" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="YUKSEK">Yüksek</option><option value="NORMAL">Normal</option><option value="DUSUK">Düşük</option></select></label></div>
    </div></section><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => router.back()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Vazgeç</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Kaydediliyor…" : "Görevi Kaydet"}</button></div></form>
  </div></main></div>;
}
