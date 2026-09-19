import Card from "../ui/Card";

export default function PrimeMemory() {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
          🧠
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            PRIME’IN HAFIZASI
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Görüşmeden önce bilmen gerekenler
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            📌 Son Konu
          </p>

          <p className="mt-2 font-medium text-slate-800">
            Yatırım amaçlı ikinci daire arıyor.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            📞 İletişim Tercihi
          </p>

          <p className="mt-2 font-medium text-slate-800">
            Telefon görüşmesi daha verimli.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            ⏳ Son Temas
          </p>

          <p className="mt-2 font-medium text-slate-800">
            38 gün önce görüşüldü.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            💡 Prime’ın Yorumu
          </p>

          <p className="mt-2 font-medium text-slate-800">
            İlişki yeniden canlandırılmalı.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          🎯 BUGÜNÜN AMACI
        </p>

        <p className="mt-3 text-lg font-semibold text-emerald-900">
          Ahmet Bey’i ara, yatırım planındaki son durumu öğren ve Park Residence
          portföyünü paylaş.
        </p>
      </div>
    </Card>
  );
}
