"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type SearchResponse = {
  query: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    location: string | null;
    relationshipScore: number;
    owner: { name: string };
  }>;
  listings: Array<{
    id: string;
    code: string;
    title: string;
    purpose: string;
    status: string;
    price: string;
    currency: string;
    property: { city: string; district: string; neighborhood: string };
  }>;
};

function money(value: string, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/search?q=" + encodeURIComponent(q), {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Arama yapılamadı.");
        setData(payload);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Arama yapılamadı.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const hasSearchQuery = query.trim().length >= 2;
  const customerCount = data?.customers.length ?? 0;
  const listingCount = data?.listings.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PrimeEstate · Global Search</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Arama</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Müşteri ve ofis portföyleri içinde tek yerden hızlıca arayın.
            </p>
          </header>

          <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <label htmlFor="global-search" className="sr-only">PrimeEstate içinde ara</label>
            <div className="flex items-center gap-3">
              <span className="text-xl text-slate-400">⌕</span>
              <input
                id="global-search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Müşteri adı, telefon, e-posta, ilan kodu, ilçe…"
                className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
              />
              {loading && <span className="text-xs font-semibold text-slate-400">Aranıyor…</span>}
            </div>
          </div>

          {hasSearchQuery && error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!hasSearchQuery && !loading && !error && (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold text-slate-900">Aramaya başlayın</p>
              <p className="mt-2 text-sm text-slate-500">En az 2 karakter yazdığınızda sonuçlar canlı olarak gelir.</p>
            </div>
          )}

          {hasSearchQuery && data && (
            <div className="mt-8 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Müşteriler</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{customerCount}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Portföyler</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{listingCount}</p>
                </div>
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-950">Müşteriler</h2>
                  <Link href="/clients" className="text-sm font-semibold text-slate-600">Tüm müşteriler →</Link>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.customers.map((customer) => (
                    <Link key={customer.id} href={"/clients/" + customer.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-slate-300">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">{customer.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{customer.phone ?? customer.email ?? "İletişim bilgisi yok"}</p>
                          <p className="mt-1 text-xs text-slate-400">{customer.location ?? "Konum yok"} · {customer.owner.name}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{customer.relationshipScore}</span>
                      </div>
                    </Link>
                  ))}
                  {!data.customers.length && <p className="text-sm text-slate-500">Müşteri sonucu yok.</p>}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-950">Portföyler</h2>
                  <Link href="/portfolio" className="text-sm font-semibold text-slate-600">Portföyü aç →</Link>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.listings.map((listing) => (
                    <Link key={listing.id} href="/portfolio" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-slate-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{listing.code}</p>
                          <p className="mt-1 font-semibold text-slate-950">{listing.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{listing.property.district} / {listing.property.neighborhood}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">{money(listing.price, listing.currency)}</p>
                      </div>
                    </Link>
                  ))}
                  {!data.listings.length && <p className="text-sm text-slate-500">Portföy sonucu yok.</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
