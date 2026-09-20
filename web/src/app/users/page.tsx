"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  officeId: string;
  teamId: string | null;
  createdAt: string;
  office: { id: string; name: string };
  team: { id: string; name: string } | null;
};

type Office = { id: string; name: string };
type Team = { id: string; name: string; officeId: string };

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Süper Yönetici",
  ORG_ADMIN: "Organizasyon Yöneticisi",
  OFFICE_ADMIN: "Ofis Yöneticisi",
  TEAM_LEADER: "Takım Lideri",
  AGENT: "Danışman",
  VIEWER: "Görüntüleyici",
  AUDITOR: "Denetçi",
};

const roleDescriptions: Record<string, string> = {
  SUPER_ADMIN: "Tüm organizasyon yönetimi",
  ORG_ADMIN: "Organizasyon ve ofis yönetimi",
  OFFICE_ADMIN: "Ofis kullanıcı yönetimi",
  TEAM_LEADER: "Takım kapsamı",
  AGENT: "Kendi müşteri ve iş akışı",
  VIEWER: "Salt görüntüleme",
  AUDITOR: "Denetim ve kayıt inceleme",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function roleTone(role: string) {
  if (role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "OFFICE_ADMIN") {
    return "bg-slate-900 text-white";
  }
  if (role === "TEAM_LEADER") return "bg-slate-100 text-slate-800";
  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentRole, setCurrentRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tümü");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kullanıcılar yüklenemedi.");
      }

      setUsers(data.users ?? []);
      setOffices(data.offices ?? []);
      setTeams(data.teams ?? []);
      setCurrentRole(data.currentUser?.role ?? "");
      setCurrentUserId(data.currentUser?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const availableRoles = useMemo(() => {
    if (currentRole === "SUPER_ADMIN") {
      return Object.keys(roleLabels);
    }
    if (currentRole === "ORG_ADMIN") {
      return ["ORG_ADMIN", "OFFICE_ADMIN", "TEAM_LEADER", "AGENT", "VIEWER", "AUDITOR"];
    }
    return ["OFFICE_ADMIN", "TEAM_LEADER", "AGENT", "VIEWER", "AUDITOR"];
  }, [currentRole]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");

    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        user.name.toLocaleLowerCase("tr-TR").includes(normalized) ||
        user.email.toLocaleLowerCase("tr-TR").includes(normalized);

      const matchesRole = filter === "Tümü" || user.role === filter;
      return matchesQuery && matchesRole;
    });
  }, [users, query, filter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.active).length,
      agents: users.filter((user) => user.role === "AGENT").length,
      leaders: users.filter((user) => user.role === "TEAM_LEADER").length,
    }),
    [users],
  );

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
      officeId: form.get("officeId"),
      teamId: form.get("teamId") || null,
    };

    try {
      const response = await fetch(editing ? "/api/users/" + editing.id : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { action: "UPDATE", ...payload } : payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kullanıcı kaydedilemedi.");
      }

      setNotice(data.message || "Kullanıcı kaydedildi.");
      setShowCreate(false);
      setEditing(null);
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kullanıcı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(user: UserItem, action: "RESET_PASSWORD" | "TOGGLE_ACTIVE") {
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/users/" + user.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "İşlem gerçekleştirilemedi.");
      }

      setNotice(data.message || "İşlem tamamlandı.");
      await loadUsers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "İşlem gerçekleştirilemedi.");
    }
  }

  function openCreate() {
    setEditing(null);
    setShowCreate(true);
  }

  function openEdit(user: UserItem) {
    setEditing(user);
    setShowCreate(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              PrimeEstate · Yönetim
            </p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Kullanıcılar & Ekip
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Danışman hesaplarını, rollerini, ekiplerini ve erişim durumlarını yönetin.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                + Yeni Kullanıcı
              </button>
            </div>
          </header>

          {error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Toplam Kullanıcı", stats.total],
              ["Aktif", stats.active],
              ["Danışman", stats.agents],
              ["Takım Lideri", stats.leaders],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ad veya e-posta ara..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white sm:max-w-sm"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700"
              >
                <option value="Tümü">Tüm roller</option>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Kullanıcılar yükleniyor…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Bu filtrelerle eşleşen kullanıcı bulunamadı.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <article key={user.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-slate-950">{user.name}</h2>
                            <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + roleTone(user.role)}>
                              {roleLabels[user.role] ?? user.role}
                            </span>
                            <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + (user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                              {user.active ? "Aktif" : "Pasif"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>Ofis: {user.office.name}</span>
                            <span>Ekip: {user.team?.name ?? "Atanmamış"}</span>
                            <span>{roleDescriptions[user.role] ?? ""}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => void runAction(user, "RESET_PASSWORD")}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Şifre Yenileme Gönder
                        </button>
                        {user.id !== currentUserId ? (
                          <button
                            type="button"
                            onClick={() => void runAction(user, "TOGGLE_ACTIVE")}
                            className={"rounded-xl px-3 py-2 text-sm font-semibold " + (user.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
                          >
                            {user.active ? "Pasifleştir" : "Aktifleştir"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Güvenlik notu</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              PrimeEstate mevcut şifreleri görüntülemez. Yönetici yalnızca güvenli bir şifre
              belirleme bağlantısı gönderebilir. Böylece danışmanın mevcut parolası hiçbir
              yönetici ekranında açığa çıkmaz.
            </p>
          </section>
        </div>
      </main>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Kullanıcı Yönetimi
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {editing ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}
                </h2>
              </div>
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="text-xl text-slate-400">×</button>
            </div>

            <form onSubmit={submitUser} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ad Soyad *</span>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">E-posta *</span>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={Boolean(editing)}
                  defaultValue={editing?.email ?? ""}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Rol *</span>
                <select
                  name="role"
                  required
                  defaultValue={editing?.role ?? "AGENT"}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ofis *</span>
                <select
                  name="officeId"
                  required
                  defaultValue={editing?.officeId ?? offices[0]?.id ?? ""}
                  disabled={currentRole === "OFFICE_ADMIN"}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm disabled:bg-slate-50"
                >
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Ekip</span>
                <select
                  name="teamId"
                  defaultValue={editing?.teamId ?? ""}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  <option value="">Ekip atama</option>
                  {teams
                    .filter((team) => !editing?.officeId || team.officeId === (editing?.officeId ?? offices[0]?.id))
                    .map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
              </label>

              {!editing ? (
                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  Kullanıcı oluşturulduğunda geçici bir kimlik bilgisi arka planda oluşturulur.
                  Kullanıcıya e-posta ile güvenli bir <strong>şifre belirleme bağlantısı</strong> gönderilir.
                  Yöneticiler hiçbir zaman mevcut şifreyi göremez.
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setEditing(null); }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor…" : editing ? "Değişiklikleri Kaydet" : "Kullanıcıyı Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
