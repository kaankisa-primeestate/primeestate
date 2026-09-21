import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          PrimeEstate
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Erişim Yetkiniz Yok
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Bu çalışma alanına erişmek için hesabınızın gerekli yönetim yetkisine sahip olması gerekir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Dashboard&apos;a Dön
        </Link>
      </section>
    </main>
  );
}
