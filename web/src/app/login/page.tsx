"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "login"
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message || "İşlem tamamlanamadı.");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">PrimeEstate</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{mode === "login" ? "Hoş geldiniz" : "Ofisinizi oluşturun"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{mode === "login" ? "Hesabınızla PrimeEstate çalışma alanınıza girin." : "İlk kayıt bir organizasyon ve ana ofis oluşturur."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Ad Soyad</span><input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" /></label>}
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">E-posta</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Şifre</span><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" /></label>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "İşleniyor..." : mode === "login" ? "Giriş Yap" : "Ofisi Oluştur"}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="mt-5 w-full text-sm font-medium text-slate-500 hover:text-slate-900">{mode === "login" ? "İlk kez kullanıyorum → Ofis oluştur" : "Zaten hesabım var → Giriş yap"}</button>
      </section>
    </main>
  );
}
