import Link from "next/link";
import Card from "../ui/Card";
import { relationships } from "../data/relationships";

export default function MorningBrief() {
  const relationship = relationships[0];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            🌅 Morning Brief
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            🤝 {relationship.name}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {relationship.lastContact} gündür görüşmediniz.
          </p>
        </div>

        <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          İlişki Skoru 94
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-semibold text-amber-900">
          💡 Prime’ın Yorumu
        </h3>

        <p className="mt-3 text-sm leading-6 text-amber-800">
          Bugün <strong>{relationship.name}</strong> ile kısa bir telefon
          görüşmesi yapman ilişkinin sıcak kalmasına yardımcı olacaktır.
          Yaklaşık 5 dakikalık bir görüşme yeterli görünüyor.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Son Görüşme
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            26 Haziran
          </p>
        </div>

        <Link
          href="/relationship/1"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          → Workspace’i Aç
        </Link>
      </div>
    </Card>
  );
}
