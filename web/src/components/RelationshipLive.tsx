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
  owner: { id: string; name: string | null; email: string | null } | null;
};

type Decision = {
  client: { id: string; name: string; phone: string | null; relationshipHealth: "strong" | "normal" | "risk" };
  today: { priority: "critical" | "high" | "medium" | "low"; confidence: number };
  reasons: string[];
  talkingPoints: string[];
  opportunities: Array<{ id: string; title: string; matchScore: number; reason: string }>;
  risks: string[];
  expectedOutcome: string;
  nextStep: string;
  lastContactDays: number | null;
};

const healthLabel = { risk: "İlişki riski", normal: "Normal", strong: "Güçlü" };
const priorityLabel = { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Normal" };

function formatDate(value: string | null) {
  if (!value) return "Henüz yok";
  return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
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
      setCustomer(customerData.customer);
      setDecision((briefData.decisions ?? []).find((item: Decision) => item.client.id === customerId) ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace yüklenemedi.");
    }
  }

  useEffect(() => {
    void load();
  }, [customerId]);

  const overdueTasks = useMemo(
    () => customer?.tasks.filter((task) => task.status !== "TAMAMLANDI" && new Date(task.dueAt).getTime() < Date.now()).length ?? 0,
    [customer],
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

        {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
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
            <p className="mt-5 text-xs uppercase tracking-wide text-slate-400">Prime'ın önerisi</p>
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

        {decision?.opportunities.length ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prime eşleşmeleri</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {decision.opportunities.map((opportunity) => (
                <div key={opportunity.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{opportunity.title}</p>
                  <p className="mt-1 text-sm text-slate-500">%{opportunity.matchScore} eşleşme</p>
                  {opportunity.reason && <p className="mt-2 text-xs text-slate-500">{opportunity.reason}</p>}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
