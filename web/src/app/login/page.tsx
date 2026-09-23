"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "E-posta veya şifre hatalı.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Giriş sırasında bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              PrimeEstate
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Hoş geldiniz
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              PrimeEstate hesabınızla çalışma alanınıza giriş yapın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                E-posta
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="ornek@primeestate.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Şifre
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                Şifremi unuttum
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-800">Ofisiniz için PrimeEstate kullanmak ister misiniz?</p>
              <Link
                href="/office-application"
                className="mt-2 inline-block text-sm font-semibold text-slate-900 underline underline-offset-4"
              >
                Ofis Başvurusu Yap
              </Link>
            </div>

            <p className="text-center text-xs leading-5 text-slate-400">
              Giriş bilgileriniz doğru değilse e-posta adresinizi kontrol edin
              veya şifrenizi yenileyin.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
