import Card from "../ui/Card";
import { relationships } from "../data/relationships";

export default function MorningBrief() {
  const relationship = relationships[0];

  return (
    <card>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        🌅 Morning Brief
      </p>

      <div className="mt-6">

        <h2 className="text-4xl font-bold">
          🤝 {relationship.name}
        </h2>

        <p className="mt-2 text-slate-500">
          {relationship.lastContact} görüşmediniz.
        </p>

      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-6">

        <h3 className="text-lg font-semibold">
          Prime'in Yorumu
        </h3>

        <p className="mt-3 text-slate-600">
          Bugünkü öneri: <strong>{relationship.nextAction}</strong>
        </p>

      </div>

      <button className="mt-8 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800">
        Workspace'i Aç
      </button>

    </card>
  );
}