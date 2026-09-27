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
  { name: "Finans", href: "/finance", icon: "💰" },
];

type SessionUser = { name?: string | null; email?: string | null; role?: string | null };

const managerRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);

function MenuLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="space-y-2">
      {menu.map((item) => (
        <li key={item.name}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      setMobileOpen(false);
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
  const canManageTeam = managerRoles.has(user?.role ?? "");

  const profile = (
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
        <Link
          href="/login"
          onClick={() => setMobileOpen(false)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
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
  );

  const teamLinks = canManageTeam ? (
    <ul className="ml-7 mt-1 space-y-1 border-l border-slate-200 pl-3">
      <li>
        <Link
          href="/users"
          onClick={() => setMobileOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Kullanıcılar
        </Link>
      </li>
      <li>
        <Link
          href="/consultant-applications"
          onClick={() => setMobileOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Danışman Başvuruları
        </Link>
      </li>
    </ul>
  ) : null;

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900">🏡 PrimeEstate</h1>
          <p className="mt-2 text-sm text-slate-500">Relationship Workspace</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <MenuLinks />
          <div className="pt-1">
            <Link
              href="/users"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="text-lg">👥</span>
              <span className="font-medium">Kullanıcılar &amp; Ekip</span>
            </Link>
            {teamLinks}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">{profile}</div>
      </aside>

      <div className="border-b border-slate-200 bg-white md:hidden">
        <div className="flex min-h-16 items-center justify-between px-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">🏡 PrimeEstate</p>
            <p className="truncate text-[11px] text-slate-500">Relationship Workspace</p>
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
            aria-controls="primeestate-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          />
          <aside
            id="primeestate-mobile-navigation"
            aria-label="Mobil navigasyon"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl md:hidden"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-slate-200 px-4">
              <div>
                <p className="text-base font-bold text-slate-900">🏡 PrimeEstate</p>
                <p className="text-[11px] text-slate-500">Navigasyon</p>
              </div>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-700"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <MenuLinks onNavigate={() => setMobileOpen(false)} />
              <div className="pt-1">
                <Link
                  href="/users"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="text-lg">👥</span>
                  <span className="font-medium">Kullanıcılar &amp; Ekip</span>
                </Link>
                {teamLinks}
              </div>
            </nav>

            <div className="border-t border-slate-200 p-4">{profile}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}
