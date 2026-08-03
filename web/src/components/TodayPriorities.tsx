export default function TodayPriorities() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

      <h2 className="mb-6 text-2xl font-bold">
        🔥 Bugünün Öncelikleri
      </h2>

      <div className="space-y-4">

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="font-semibold">
              🤝 Ahmet Yılmaz'ı Ara
            </p>

            <p className="text-sm text-slate-500">
              38 gündür görüşmediniz.
            </p>
          </div>

          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
            Yüksek
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="font-semibold">
              🏡 Ataşehir Portföyünü Güncelle
            </p>

            <p className="text-sm text-slate-500">
              Eksik fotoğraflar bulunuyor.
            </p>
          </div>

          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            Orta
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="font-semibold">
              📅 RE/MAX Bölge Toplantısı
            </p>

            <p className="text-sm text-slate-500">
              Saat 15:00
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
            Takvim
          </span>
        </div>

      </div>

    </section>
  );
}