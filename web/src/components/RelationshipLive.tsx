"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Activity = {
  id: string;
  type: string;
  occurredAt: string;
  summary: string;
  outcome: string | null;
};

type Task = {
  id: string;
  title: string;
  dueAt: string;
  priority: string;
  status: string;
};

type Demand = {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  urgency: string;
  active: boolean;
  preferences: unknown;
};

type Showing = {
  id: string;
  dateTime: string;
  status: "PLANLANDI" | "GERCEKLESTI" | "IPTAL";
  attendees: number;
  note: string | null;
  listing: {
    id: string;
    code: string;
    title: string;
    price: number;
    currency: string;
    property: { city: string; district: string; neighborhood: string };
  };
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  relationshipScore: number;
  lastContactAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  roles: Array<{ role: string }>;
  demands: Demand[];
  activities: Activity[];
  tasks: Task[];
  showings: Showing[];
  owner: { id: string; name: string | null; email: string | null } | null;
};

type Opportunity = {
  id: string;
  listingId: string;
  code: string;
  title: string;
  matchScore: number;
  price: number;
  currency: string;
  location: string;
  sizeM2: number | null;
  rooms: string | null;
  reason: string;
  reasons: unknown[];
  mismatches: unknown[];
};

type Decision = {
  client: { id: string; name: string; phone: string | null; relationshipHealth: "strong" | "normal" | "risk" };
  today: { priority: "critical" | "high" | "medium" | "low"; confidence: number };
  reasons: string[];
  talkingPoints: string[];
  opportunities: Opportunity[];
  risks: string[];
  expectedOutcome: string;
  nextStep: string;
  lastContactDays: number | null;
};

type ShowingDraft = {
  status: Showing["status"];
  note: string;
};

const healthLabel = { risk: "İlişki riski", normal: "Normal", strong: "Güçlü" };
const priorityLabel = { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Normal" };
const showingStatusLabel = {
  PLANLANDI: "Planlandı",
  GERCEKLESTI: "Gerçekleşti",
  IPTAL: "İptal",
};

function formatDate(value: string | null) {
  if (!value) return "Henüz yok";
  return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value) + " " + currency;
}

function learnedPreferences(demands: Demand[]) {
  const positive = new Set<string>();
  const negative = new Set<string>();

  for (const demand of demands) {
    if (!demand.preferences || typeof demand.preferences !== "object" || Array.isArray(demand.preferences)) continue;
    const record = demand.preferences as Record<string, unknown>;
    const learning = record.primeLearning;
    if (!learning || typeof learning !== "object" || Array.isArray(learning)) continue;
    const value = learning as Record<string, unknown>;
    if (Array.isArray(value.positive)) value.positive.filter((item): item is string => typeof item === "string").forEach((item) => positive.add(item));
    if (Array.isArray(value.negative)) value.negative.filter((item): item is string => typeof item === "string").forEach((item) => negative.add(item));
  }

  return { positive: [...positive], negative: [...negative] };
}

function activityLabel(type: string) {
  const labels: Record<string, string> = {
    ARAMA: "Telefon görüşmesi",
    WHATSAPP: "WhatsApp",
    EMAIL: "E-posta",
    NOT: "Not",
    GOSTERIM: "Gösterim",
    TEKLIF: "Teklif",
  };
  return labels[type] ?? type;
}

export default function RelationshipLive({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [outcome, setOutcome] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [showingDateTime, setShowingDateTime] = useState("");
  const [showingConfirmationUrl, setShowingConfirmationUrl] = useState<string | null>(null);
  const [showingListingId, setShowingListingId] = useState("");
  const [showingDrafts, setShowingDrafts] = useState<Record<string, ShowingDraft>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [customerResponse, briefResponse] = await Promise.all([
        fetch("/api/customers/" + customerId, { cache: "no-store" }),
        fetch("/api/prime/brief", { cache: "no-store" }),
      ]);
      const customerData = await customerResponse.json();
      const briefData = await briefResponse.json();
      if (!customerResponse.ok) throw new Error(customerData?.message ?? "Müşteri yüklenemedi.");
      if (!briefResponse.ok) throw new Error(briefData?.message ?? "Prime önerisi yüklenemedi.");

      const nextCustomer = customerData.customer as Customer;
      setCustomer(nextCustomer);
      setDecision((briefData.decisions ?? []).find((item: Decision) => item.client.id === customerId) ?? null);
      setShowingDrafts(
        Object.fromEntries(
          (nextCustomer.showings ?? []).map((showing) => [
            showing.id,
            { status: showing.status, note: showing.note ?? "" },
          ]),
        ),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace yüklenemedi.");
    }
  }

  useEffect(() => {
    const loadInitial = async () => {
      await load();
    };
    void loadInitial();
  }, [customerId]);

  const [nowMs] = useState(() => Date.now());
  const learning = useMemo(() => learnedPreferences(customer?.demands ?? []), [customer?.demands]);

  const overdueTasks = useMemo(
    () => customer?.tasks.filter((task) => task.status !== "TAMAMLANDI" && new Date(task.dueAt).getTime() < nowMs).length ?? 0,
    [customer, nowMs],
  );

  async function recordActivity(type: "ARAMA" | "WHATSAPP") {
    if (!customer) return;
    setBusy(type);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          type,
          summary: type === "ARAMA" ? "Prime önerisiyle telefon görüşmesi başlatıldı." : "Prime önerisiyle WhatsApp teması başlatıldı.",
          outcome: outcome.trim() || null,
          metadata: { source: "PRIME_BRAIN", workspace: "RELATIONSHIP" },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Aktivite kaydedilemedi.");
      setOutcome("");
      setMessage("Temas kaydedildi. Prime hafızası güncellendi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktivite kaydedilemedi.");
    } finally {
      setBusy("");
    }
  }

  async function createTask() {
    if (!customer || !decision) return;
    if (!dueAt) {
      setError("Görev için tarih ve saat seç.");
      return;
    }
    setBusy("task");
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          title: "Prime: " + decision.nextStep,
          dueAt: new Date(dueAt).toISOString(),
          priority: "YUKSEK",
          source: "PRIME_BRAIN",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Görev oluşturulamadı.");
      setDueAt("");
      setMessage("Sonraki adım göreve dönüştürüldü.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görev oluşturulamadı.");
    } finally {
      setBusy("");
    }
  }

  async function refreshMatches() {
    if (!customer) return;
    const activeDemands = customer.demands.filter((demand) => demand.active);
    if (!activeDemands.length) {
      setError("Önce bu müşteri için aktif bir talep oluştur.");
      return;
    }

    setBusy("matching");
    setMessage("");
    setError("");
    try {
      for (const demand of activeDemands) {
        const response = await fetch("/api/matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandId: demand.id, limit: 20 }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message ?? "Eşleştirme çalıştırılamadı.");
      }
      setMessage("Prime eşleştirmeleri güncellendi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eşleştirme güncellenemedi.");
    } finally {
      setBusy("");
    }
  }

  async function createShowing() {
    if (!customer || !showingListingId || !showingDateTime) {
      setError("Gösterim için portföy ve tarih-saat seç.");
      return;
    }

    setBusy("showing-create");
    setMessage("");
    setError("");
    setShowingConfirmationUrl(null);
    try {
      const response = await fetch("/api/prime/showing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          listingId: showingListingId,
          dateTime: new Date(showingDateTime).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Gösterim oluşturulamadı.");
      setShowingDateTime("");
      setShowingListingId("");
      setShowingConfirmationUrl(data.confirmation?.whatsappUrl ?? null);
      setMessage("Gösterim planlandı. Prime teyit görevini oluşturdu ve sonraki adımı “Gösterim teyidini al” olarak ayarladı.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gösterim oluşturulamadı.");
    } finally {
      setBusy("");
    }
  }
  async function updateShowing(showingId: string) {
    const draft = showingDrafts[showingId];
    if (!draft) return;

    setBusy("showing-" + showingId);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/showings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showingId,
          status: draft.status,
          note: draft.note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Gösterim güncellenemedi.");
      setMessage(
        draft.status === "GERCEKLESTI"
          ? "Gösterim sonucu kaydedildi. Prime bunu hafızasına aldı ve sonraki eşleşmeye hazırlıyor."
          : "Gösterim güncellendi.",
      );
      await load();
      if (draft.status === "GERCEKLESTI") {
        await refreshMatches();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gösterim güncellenemedi.");
    } finally {
      setBusy("");
    }
  }

  if (error && !customer) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!customer) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Müşteri Workspace yükleniyor…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900">
            ← Dashboard
          </Link>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">İlişki Workspace · Live</span>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700"><div>{message}</div>{showingConfirmationUrl && <a href={showingConfirmationUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">WhatsApp ile Gösterim Teyidi Gönder</a>}</div>}
        {error && <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Relationship Workspace</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{customer.name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {customer.roles.map((role) => <span key={role.role} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{role.role}</span>)}
                {customer.location && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">📍 {customer.location}</span>}
                {customer.owner?.name && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Sorumlu: {customer.owner.name}</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-6 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">İlişki skoru</p>
              <p className="mt-1 text-4xl font-bold text-slate-900">{customer.relationshipScore}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Son temas</p><p className="mt-1 font-semibold">{formatDate(customer.lastContactAt)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Sonraki aksiyon</p><p className="mt-1 font-semibold">{customer.nextAction ?? "Prime belirleyecek"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Gecikmiş görev</p><p className="mt-1 font-semibold">{overdueTasks}</p></div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{decision ? priorityLabel[decision.today.priority] : "Prime bekliyor"}</span>
              {decision && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{healthLabel[decision.client.relationshipHealth]}</span>}
              {decision && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">%{decision.today.confidence} güven</span>}
            </div>
            <p className="mt-5 text-xs uppercase tracking-wide text-slate-400">Prime&apos;ın önerisi</p>
            <h2 className="mt-2 text-2xl font-semibold">{decision?.nextStep ?? "Bu müşteri için henüz otomatik bir sonraki adım oluşmadı."}</h2>
            {decision?.expectedOutcome && <p className="mt-3 text-sm text-slate-300">Beklenen sonuç: {decision.expectedOutcome}</p>}
            {decision?.reasons.length ? (
              <ul className="mt-5 space-y-2 text-sm text-slate-300">{decision.reasons.slice(0, 4).map((reason) => <li key={reason}>• {reason}</li>)}</ul>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Şimdi harekete geç</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {customer.phone ? (
                <>
                  <a href={"tel:" + customer.phone} onClick={() => void recordActivity("ARAMA")} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">📞 Ara</a>
                  <a href={"https://wa.me/" + customer.phone.replace(/\D/g, "").replace(/^0/, "90")} target="_blank" rel="noreferrer" onClick={() => void recordActivity("WHATSAPP")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">WhatsApp</a>
                </>
              ) : <span className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">Telefon kaydı yok</span>}
            </div>
            <input value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Temas sonucu: örn. yeni portföy ilgisini koruyor" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            {decision && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sonraki adımı göreve çevir</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  <button type="button" onClick={() => void createTask()} disabled={busy === "task"} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "task" ? "Kaydediliyor…" : "Görev Oluştur"}</button>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prime eşleşmeleri</p>
              <h2 className="mt-1 text-xl font-semibold">Bu müşteriye uygun portföyler</h2>
              <p className="mt-1 text-sm text-slate-500">Eşleşme; talep, lokasyon, bütçe, m², oda ve özelliklere göre hesaplanıyor.</p>
            </div>
            <button type="button" onClick={() => void refreshMatches()} disabled={busy === "matching"} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "matching" ? "Eşleştiriliyor…" : "Eşleşmeleri Yenile"}
            </button>
          </div>

          {decision?.opportunities.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {decision.opportunities.map((opportunity) => (
                <div key={opportunity.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">{opportunity.code}</p>
                      <p className="mt-1 font-semibold text-slate-900">{opportunity.title}</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">%{opportunity.matchScore}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">{formatMoney(opportunity.price, opportunity.currency)}</p>
                  {opportunity.location && <p className="mt-1 text-xs text-slate-500">{opportunity.location}</p>}
                  {(opportunity.rooms || opportunity.sizeM2) && <p className="mt-1 text-xs text-slate-500">{opportunity.rooms ?? "Oda belirtilmemiş"} {opportunity.sizeM2 ? "· " + opportunity.sizeM2 + " m²" : ""}</p>}
                  {opportunity.reasons.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-500">
                      {opportunity.reasons.map((reason, index) => <li key={index}>• {String(reason)}</li>)}
                    </ul>
                  ) : null}
                  {opportunity.mismatches.length ? <p className="mt-3 text-xs text-amber-700">Dikkat: {opportunity.mismatches.map(String).join(", ")}</p> : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowingListingId(opportunity.listingId);
                      setMessage("Gösterim için tarih ve saat seç.");
                    }}
                    className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gösterim Planla
                  </button>
                  {showingListingId === opportunity.listingId && (
                    <div className="mt-3 flex gap-2">
                      <input type="datetime-local" value={showingDateTime} onChange={(event) => setShowingDateTime(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <button type="button" onClick={() => void createShowing()} disabled={busy === "showing-create"} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "showing-create" ? "…" : "Kaydet"}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              Henüz eşleşme görünmüyor. <strong>Eşleşmeleri Yenile</strong> ile aktif müşteri taleplerini ofis portföyüyle tekrar eşleştirebilirsin.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prime öğreniyor</p>
              <h2 className="mt-1 text-xl font-semibold">Müşterinin gerçek tercih hafızası</h2>
              <p className="mt-1 text-sm text-slate-500">Gösterim geri bildirimlerinden açıkça yakalanan tercih sinyalleri burada tutulur ve sonraki eşleşme skoruna küçük bir ağırlık verir.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{learning.positive.length + learning.negative.length} öğrenilmiş sinyal</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Olumlu</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {learning.positive.length ? learning.positive.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">{item}</span>) : <span className="text-sm text-emerald-700/70">Henüz öğrenilmiş olumlu tercih yok.</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Olumsuz</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {learning.negative.length ? learning.negative.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700">{item}</span>) : <span className="text-sm text-amber-700/70">Henüz öğrenilmiş olumsuz tercih yok.</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gösterim hafızası</p>
            <h2 className="mt-1 text-xl font-semibold">Müşteri hangi portföyleri gördü?</h2>
            <p className="mt-1 text-sm text-slate-500">Gösterim sonucu ve danışman notu kaydedildiğinde Prime bunu sonraki önerilerde kullanabilecek temel hafızaya sahip olur.</p>
          </div>
          <div className="mt-5 space-y-4">
            {customer.showings.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Henüz planlanmış veya tamamlanmış gösterim yok.</p>
            ) : (
              customer.showings.map((showing) => {
                const draft = showingDrafts[showing.id] ?? { status: showing.status, note: showing.note ?? "" };
                return (
                  <div key={showing.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">{showing.listing.code} · {formatDateTime(showing.dateTime)}</p>
                        <p className="mt-1 font-semibold text-slate-900">{showing.listing.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{showing.listing.property.district} · {showing.listing.property.neighborhood} · {formatMoney(Number(showing.listing.price), showing.listing.currency)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{showingStatusLabel[showing.status]}</span>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                      <select
                        value={draft.status}
                        onChange={(event) => setShowingDrafts((current) => ({ ...current, [showing.id]: { ...draft, status: event.target.value as Showing["status"] } }))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      >
                        <option value="PLANLANDI">Planlandı</option>
                        <option value="GERCEKLESTI">Gerçekleşti</option>
                        <option value="IPTAL">İptal</option>
                      </select>
                      <input
                        value={draft.note}
                        onChange={(event) => setShowingDrafts((current) => ({ ...current, [showing.id]: { ...draft, note: event.target.value } }))}
                        placeholder="Gösterim sonucu: neden beğendi / neden reddetti / hangi özellik önemliydi?"
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      />
                      <button type="button" onClick={() => void updateShowing(showing.id)} disabled={busy === "showing-" + showing.id} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                        {busy === "showing-" + showing.id ? "Kaydediliyor…" : "Sonucu Kaydet"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prime hafızası</p><h2 className="mt-1 text-xl font-semibold">Gerçek ilişki geçmişi</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{customer.activities.length} kayıt</span></div>
            <div className="mt-5 space-y-4">
              {customer.activities.length === 0 ? <p className="text-sm text-slate-500">Henüz kayıtlı temas yok.</p> : customer.activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-slate-200 pl-4">
                  <p className="text-xs text-slate-400">{formatDate(activity.occurredAt)} · {activityLabel(activity.type)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{activity.summary}</p>
                  {activity.outcome && <p className="mt-1 text-sm text-slate-500">Sonuç: {activity.outcome}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Müşteri bağlamı</p>
            <h2 className="mt-1 text-xl font-semibold">Talep ve açık görevler</h2>
            <div className="mt-5 space-y-3">
              {customer.demands.filter((demand) => demand.active).map((demand) => (
                <div key={demand.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{demand.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{demand.type} · {demand.propertyType} · {demand.urgency}</p>
                </div>
              ))}
              {customer.tasks.filter((task) => task.status !== "TAMAMLANDI").map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Vade: {formatDate(task.dueAt)} · {task.priority}</p>
                </div>
              ))}
              {!customer.demands.some((demand) => demand.active) && !customer.tasks.some((task) => task.status !== "TAMAMLANDI") && <p className="text-sm text-slate-500">Açık talep veya görev bulunmuyor.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
