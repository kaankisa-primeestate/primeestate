"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const menu = [
  { name: "Dashboard", href: "/", icon: "🏠" },
  { name: "CRM Akış Merkezi", href: "/crm", icon: "🧭" },
  { name: "İlişkiler", href: "/relationships", icon: "🤝" },
  { name: "Portföyler", href: "/portfolio", icon: "🏡" },
  { name: "Eşleştirme", href: "/matching", icon: "🎯" },
  { name: "İş Akışı", href: "/sales", icon: "⚡" },
  { name: "Takvim", href: "/calendar", icon: "📅" },
  { name: "Müşteriler", href: "/clients", icon: "👤" },
  { name: "Aramalar", href: "/calls", icon: "📞" },
  { name: "Finans", href: "/finance/dashboard", icon: "💰" },
  { name: "Kullanıcılar & Ekip", href: "/users", icon: "👥" },
];

type SessionUser = { name?: string | null; email?: string | null; role?: string | null };

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/get-session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data?.user ?? null;
      })
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const displayName = user?.name || user?.email || "Aktif kullanıcı";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">🏡 PrimeEstate</h1>
        <p className="mt-2 text-sm text-slate-500">Relationship Workspace</p>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menu.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {initials || "PE"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.role || "PrimeEstate hesabı"}</p>
            </div>
          </div>
          {user?.email ? <p className="mt-3 truncate text-xs text-slate-500">{user.email}</p> : null}
          <div className="mt-4 flex gap-2">
            <Link href="/login" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100">
              Giriş
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
