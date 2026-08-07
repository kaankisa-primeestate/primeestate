import Card from "../ui/Card";

export default function PersonSummary() {
  return (
    <Card className="p-6">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            👤 KİŞİ ÖZETİ
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Ahmet Yılmaz
          </h2>

          <p className="mt-2 text-slate-500">
            Yaklaşık 2 yıldır aktif müşteri
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-center">

          <p className="text-xs font-semibold uppercase text-emerald-700">
            İlişki Skoru
          </p>

          <p className="mt-1 text-3xl font-bold text-emerald-700">
            94
          </p>

        </div>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">💼 Meslek</p>
          <p className="mt-1 font-semibold">İnşaat Mühendisi</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">📍 Bölge</p>
          <p className="mt-1 font-semibold">Ataşehir</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">👨‍👩‍👧 Aile</p>
          <p className="mt-1 font-semibold">Evli • 2 Çocuk</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">🎯 İlgi Alanı</p>
          <p className="mt-1 font-semibold">Yatırım Amaçlı Konut</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">📞 İletişim</p>
          <p className="mt-1 font-semibold">Telefon Görüşmesi</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">🕒 En Uygun Saat</p>
          <p className="mt-1 font-semibold">18:00 - 20:00</p>
        </div>

      </div>

    </Card>
  );
}