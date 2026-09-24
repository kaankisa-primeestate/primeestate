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
  consultantProfile: {
    firstName: string;
    lastName: string;
    phone: string;
    tcIdentityLast4: string;
  } | null;
  consultantCompany: {
    name: string;
    title: string | null;
    taxNumber: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  consultantCommissionPlan: {
    model: string;
    officeShareRate: string | null;
    consultantShareRate: string | null;
    active: boolean;
    effectiveFrom: string;
    effectiveTo: string | null;
  } | null;
  consultantApplication: {
    status: string;
    createdAt: string;
  } | null;
  performance: {
    customerCount: number;
    listingCount: number;
    activeListingCount: number;
    saleCount: number;
    closedSaleCount: number;
    closedSalesVolume: number;
  };
};

type Office = { id: string; name: string };
type Team = { id: string; name: string; officeId: string };

const managerRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);

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
  const [officeSlug, setOfficeSlug] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
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
    let cancelled = false;

    async function initializeUsers() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Kullanıcılar yüklenemedi.");
        }

        if (cancelled) return;

        setUsers(data.users ?? []);
        setOffices(data.offices ?? []);
        setTeams(data.teams ?? []);
        setCurrentRole(data.currentUser?.role ?? "");
        setCurrentUserId(data.currentUser?.id ?? "");
        setOfficeSlug(data.currentUser?.officeSlug ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Kullanıcılar yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initializeUsers();

    return () => {
      cancelled = true;
    };
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

      if (editing?.role === "AGENT") {
        const consultantResponse = await fetch("/api/users/" + editing.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_CONSULTANT",
            profile: {
              firstName: form.get("consultantFirstName"),
              lastName: form.get("consultantLastName"),
              phone: form.get("consultantPhone"),
            },
            company: {
              name: form.get("companyName"),
              title: form.get("companyTitle"),
              taxNumber: form.get("companyTaxNumber"),
              phone: form.get("companyPhone"),
              email: form.get("companyEmail"),
            },
            commission: {
              model: form.get("commissionModel"),
              officeShareRate: form.get("officeShareRate"),
              consultantShareRate: form.get("consultantShareRate"),
            },
          }),
        });
        const consultantData = await consultantResponse.json();
        if (!consultantResponse.ok) {
          throw new Error(consultantData.message || "Danışman bilgileri güncellenemedi.");
        }
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

          {currentRole && managerRoles.has(currentRole) && officeSlug ? (
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Danışman katılım bağlantısı
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Danışmanlarınız bu bağlantıdan başvursun
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Başvuru formu ofisinize özel açılır. Başvuran kişi, Broker onayından sonra hesabını kullanabilir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}/consultant-application?office=${encodeURIComponent(officeSlug)}`;
                    await navigator.clipboard.writeText(url);
                    setInviteCopied(true);
                    window.setTimeout(() => setInviteCopied(false), 1800);
                  }}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {inviteCopied ? "Kopyalandı ✓" : "Bağlantıyı Kopyala"}
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 font-mono text-xs text-slate-600 break-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/consultant-application?office=${officeSlug}`
                  : `/consultant-application?office=${officeSlug}`}
              </div>
            </section>
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

                          {user.role === "AGENT" ? (
                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-xl border border-slate-100 bg-white p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Müşteri</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{user.performance.customerCount}</p>
                                <p className="text-xs text-slate-400">kendi müşteri kaydı</p>
                              </div>
                              <div className="rounded-xl border border-slate-100 bg-white p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Portföy</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{user.performance.activeListingCount}</p>
                                <p className="text-xs text-slate-400">{user.performance.listingCount} toplam ilan</p>
                              </div>
                              <div className="rounded-xl border border-slate-100 bg-white p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Satış</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{user.performance.closedSaleCount}</p>
                                <p className="text-xs text-slate-400">{user.performance.saleCount} satış kaydı</p>
                              </div>
                              <div className="rounded-xl border border-slate-100 bg-white p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Satış hacmi</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                  {new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(user.performance.closedSalesVolume)} ₺
                                </p>
                                <p className="text-xs text-slate-400">tamamlanan satışlar</p>
                              </div>
                            </div>
                          ) : null}

                          {user.role === "AGENT" ? (
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  Danışman profili
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {user.consultantProfile
                                    ? `${user.consultantProfile.firstName} ${user.consultantProfile.lastName}`
                                    : "Profil bekleniyor"}
                                </p>
                                {user.consultantProfile ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {user.consultantProfile.phone} · T.C. ****{user.consultantProfile.tcIdentityLast4}
                                  </p>
                                ) : null}
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  Şirket
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {user.consultantCompany?.name ?? "Şirket bilgisi bekleniyor"}
                                </p>
                                {user.consultantCompany ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {user.consultantCompany.title ?? "Ünvan belirtilmemiş"}
                                    {user.consultantCompany.taxNumber ? ` · VKN ${user.consultantCompany.taxNumber}` : ""}
                                  </p>
                                ) : null}
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  Komisyon
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {user.consultantCommissionPlan?.model ?? "Plan bekleniyor"}
                                </p>
                                {user.consultantCommissionPlan ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Ofis %{user.consultantCommissionPlan.officeShareRate ?? "—"} · Danışman %{user.consultantCommissionPlan.consultantShareRate ?? "—"}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {user.role === "AGENT" && user.consultantApplication ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-slate-400">Başvuru durumu:</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                {user.consultantApplication.status === "ONAYLANDI"
                                  ? "Onaylandı"
                                  : user.consultantApplication.status === "REDDEDILDI"
                                    ? "Reddedildi"
                                    : "Beklemede"}
                              </span>
                            </div>
                          ) : null}
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

              {editing?.role === "AGENT" && editing.consultantProfile && editing.consultantCompany && editing.consultantCommissionPlan ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Danışman profili
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Ad *</span>
                        <input name="consultantFirstName" required defaultValue={editing.consultantProfile.firstName} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Soyad *</span>
                        <input name="consultantLastName" required defaultValue={editing.consultantProfile.lastName} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-slate-700">Telefon *</span>
                      <input name="consultantPhone" required defaultValue={editing.consultantProfile.phone} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                    </label>
                    <p className="mt-2 text-xs text-slate-400">T.C. kimlik no değiştirilemez. Kayıt: ****{editing.consultantProfile.tcIdentityLast4}</p>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Şirket bilgileri</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-semibold text-slate-700">Şirket adı *</span>
                        <input name="companyName" required defaultValue={editing.consultantCompany.name} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Ünvan</span>
                        <input name="companyTitle" defaultValue={editing.consultantCompany.title ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Vergi No</span>
                        <input name="companyTaxNumber" defaultValue={editing.consultantCompany.taxNumber ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Şirket telefonu</span>
                        <input name="companyPhone" defaultValue={editing.consultantCompany.phone ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Şirket e-postası</span>
                        <input name="companyEmail" type="email" defaultValue={editing.consultantCompany.email ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Komisyon planı</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="block sm:col-span-3">
                        <span className="text-sm font-semibold text-slate-700">Model *</span>
                        <input name="commissionModel" required defaultValue={editing.consultantCommissionPlan.model} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Ofis payı %</span>
                        <input name="officeShareRate" type="number" min="0" max="100" step="0.01" defaultValue={editing.consultantCommissionPlan.officeShareRate ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Danışman payı %</span>
                        <input name="consultantShareRate" type="number" min="0" max="100" step="0.01" defaultValue={editing.consultantCommissionPlan.consultantShareRate ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Bu alan oranları kaydeder. REP / maksimum modelinin hesaplama kuralını ayrıca netleştirip uygulayacağız.</p>
                  </div>
                </div>
              ) : null}

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
