"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Decision = {
  client: { id: string; name: string; phone: string | null; relationshipHealth: "strong" | "normal" | "risk" };
  objective: string;
  today: { action: string; priority: "critical" | "high" | "medium" | "low"; confidence: number };
  reasons: string[];
  talkingPoints: string[];
  opportunities: Array<{ id: string; title: string; matchScore: number; reason: string }>;
  risks: string[];
  expectedOutcome: string;
  nextStep: string;
  lastContactDays: number | null;
};

const priorityLabel = { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Normal" };
const healthLabel = { risk: "İlişki riski", normal: "Normal", strong: "Güçlü" };

export default function PrimeBriefLive() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/prime/brief", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Prime Brief alınamadı.");
      setDecisions(data.decisions ?? []);
      setGeneratedAt(data.generatedAt ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prime Brief alınamadı.");
    }
  }

  useEffect(() => {
    const loadInitial = async () => {
      await load();
    };
    void loadInitial();
    const interval = setInterval(() => void load(), 60000);
    return () => clearInterval(interval);
  }, []);

  async function recordActivity(customerId: string, type: "ARAMA" | "WHATSAPP", summary: string) {
    setBusyAction(type);
    setSuccess("");
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          type,
          summary,
          outcome: outcome.trim() || null,
          metadata: { source: "PRIME_BRAIN" },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Aktivite kaydedilemedi.");
      setOutcome("");
      setSuccess("Temas Prime hafızasına kaydedildi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktivite kaydedilemedi.");
    } finally {
      setBusyAction("");
    }
  }

  async function createTask(customerId: string, customerName: string, nextStep: string) {
    if (!dueAt) {
      setError("Görev için bir tarih ve saat seç.");
      return;
    }
    setBusyAction("task");
    setSuccess("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          title: "Prime: " + nextStep,
          dueAt: new Date(dueAt).toISOString(),
          priority: "YUKSEK",
          source: "PRIME_BRAIN",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? "Görev oluşturulamadı.");
      setDueAt("");
      setSuccess(customerName + " için görev oluşturuldu.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görev oluşturulamadı.");
    } finally {
      setBusyAction("");
    }
  }

  const lead = decisions[0];

  return (
    <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-500">Prime Brain · Live</p>
          <h2 className="mt-1 text-2xl font-semibold">Bugün ne yapmalısın?</h2>
          <p className="mt-1 text-sm text-slate-500">Öneriler gerçek müşteri, görev, temas ve eşleşme verilerinden üretiliyor.</p>
        </div>
        {generatedAt && <span className="text-xs text-slate-400">Güncellendi {new Date(generatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>

      {error && <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {success && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      {!error && lead && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{priorityLabel[lead.today.priority]}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{healthLabel[lead.client.relationshipHealth]}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">%{lead.today.confidence} güven</span>
            </div>
            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400">Öncelikli müşteri</p>
            <h3 className="mt-1 text-2xl font-semibold">{lead.client.name}</h3>
            <p className="mt-2 text-sm text-slate-300">{lead.objective}</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prime&apos;ın gerekçesi</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {lead.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </div>
            <Link href={"/relationship/" + lead.client.id} className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
              Müşteri Workspace&apos;ini Aç →
            </Link>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bugünün önerisi</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{lead.nextStep}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.client.phone ? (
                <>
                  <a
                    href={"tel:" + lead.client.phone}
                    onClick={() => { void recordActivity(lead.client.id, "ARAMA", "Prime önerisiyle telefon görüşmesi başlatıldı."); }}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    📞 Ara
                  </a>
                  <a
                    href={"https://wa.me/" + lead.client.phone.replace(/\D/g, "").replace(/^0/, "90")}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { void recordActivity(lead.client.id, "WHATSAPP", "Prime önerisiyle WhatsApp teması başlatıldı."); }}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                </>
              ) : (
                <span className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">Telefon kaydı yok</span>
              )}
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Temas sonucu</p>
              <input value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Örn. Yeni portföy ilgisini koruyor." className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm" />
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sonraki adımı göreve çevir</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" />
                <button type="button" disabled={busyAction === "task"} onClick={() => void createTask(lead.client.id, lead.client.name, lead.nextStep)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {busyAction === "task" ? "Kaydediliyor…" : "Görev Oluştur"}
                </button>
              </div>
            </div>

            {lead.talkingPoints.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Konuşma noktaları</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {lead.talkingPoints.slice(0, 3).map((point) => <li key={point}>• {point}</li>)}
                </ul>
              </div>
            )}
            {lead.opportunities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fırsatlar</p>
                {lead.opportunities.slice(0, 2).map((opportunity) => (
                  <div key={opportunity.id} className="mt-2 rounded-xl border bg-white p-3">
                    <p className="text-sm font-semibold">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">%{opportunity.matchScore} eşleşme</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!error && !lead && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
          Prime şu anda önceliklendirilecek bir müşteri bulamadı.
        </div>
      )}
    </section>
  );
}
