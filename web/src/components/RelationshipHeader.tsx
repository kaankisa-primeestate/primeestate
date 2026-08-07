import { relationships } from "../data/relationships";

export default function RelationshipHeader() {
  const relationship = relationships[0];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            👤 {relationship.name}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              💼 İnşaat Mühendisi
            </span>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              📍 Ataşehir
            </span>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              👨‍👩‍👧 Evli • 2 Çocuk
            </span>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              🏠 2023'ten beri müşteri
            </span>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              📞 Telefon tercih ediyor
            </span>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              🕒 18:00–20:00 uygun
            </span>

          </div>

        </div>

        <div className="rounded-2xl bg-emerald-50 px-6 py-5 text-center">

          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            İLİŞKİ SKORU
          </p>

          <p className="mt-2 text-4xl font-bold text-emerald-700">
            {relationship.relationshipScore}
          </p>

        </div>

      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">

        <div className="rounded-xl bg-slate-50 p-4">

          <p className="text-xs uppercase tracking-wide text-slate-400">
            Son Görüşme
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {relationship.lastContact} gün önce
          </p>

        </div>

        <div className="rounded-xl bg-slate-50 p-4">

          <p className="text-xs uppercase tracking-wide text-slate-400">
            Sonraki Aksiyon
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {relationship.nextAction}
          </p>

        </div>

        <div className="rounded-xl bg-slate-50 p-4">

          <p className="text-xs uppercase tracking-wide text-slate-400">
            Öncelik
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {relationship.priority}
          </p>

        </div>

      </div>

    </section>
  );
}