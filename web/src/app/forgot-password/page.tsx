"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message ?? "Şifre yenileme e-postası gönderilemedi.",
        );
      }

      setMessage(
        "Eğer bu e-posta ile kayıtlı bir PrimeEstate hesabı varsa, şifre yenileme bağlantısını içeren bir e-posta gönderildi.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Şifre yenileme sırasında bir hata oluştu.",
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
              Şifrenizi mi unuttunuz?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Hesabınızın e-posta adresini girin. Şifrenizi yenilemeniz için
              güvenli bir bağlantı gönderelim.
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

            {message ? (
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {message}
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gönderiliyor..." : "Şifre Yenileme Bağlantısı Gönder"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              Giriş ekranına dön
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}
