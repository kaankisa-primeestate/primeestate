import Card from "../ui/Card";

export default function TodaysFocus() {
  return (
    <Card className="mb-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            🎯 Bugünün Odağı
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            🤝 Ahmet Yılmaz
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              🟢 İlişki Skoru 94
            </span>

            <span className="text-sm text-slate-500">
              Son görüşme • 26 Haziran
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-base font-bold text-amber-900">
          💡 Prime’ın Önerisi
        </h3>

        <p className="mt-2 leading-7 text-amber-800">
          Bugün Ahmet’i aramanın tam zamanı.
          Yaklaşık <strong>5 dakikalık</strong> kısa bir görüşme,
          ilişkinizin sıcak kalmasına yardımcı olacaktır.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Son temasın üzerinden
          <span className="ml-2 font-bold text-slate-900">
            38 gün
          </span>
          geçti.
        </div>

        <button className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800">
          → İlişkiye Git
        </button>
      </div>
    </Card>
  );
}
