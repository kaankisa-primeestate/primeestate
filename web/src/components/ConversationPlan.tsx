import Card from "../ui/Card";

export default function NextAction() {
  return (
    <Card className="p-6">

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        🎯 SONRAKİ ADIM
      </p>

      <h2 className="mt-2 text-2xl font-bold text-slate-900">
        Prime'ın Önerdiği Aksiyon
      </h2>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">

        <p className="text-lg leading-8 text-emerald-900">
          Bugün <strong>Ahmet Yılmaz</strong> ile kısa bir telefon görüşmesi
          yapman öneriliyor.
        </p>

        <p className="mt-3 text-sm text-emerald-700">
          Yaklaşık 5 dakikalık bir görüşme ilişkinin sıcak kalmasını
          sağlayacaktır.
        </p>

      </div>

      <div className="mt-6 flex gap-4">

        <button className="flex-1 rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800">
          📞 Telefon Et
        </button>

        <button className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">
          📅 Takvime Ekle
        </button>

      </div>

    </Card>
  );
}