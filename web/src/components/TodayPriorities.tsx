import Card from "../ui/Card";

const priorities = [
  {
    title: "Ahmet Yılmaz",
    action: "Telefon Görüşmesi",
    priority: "Yüksek",
    color: "bg-red-100 text-red-700",
  },
  {
    title: "Ayşe Demir",
    action: "Ekspertiz Randevusu",
    priority: "Orta",
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Mehmet Kaya",
    action: "Fiyat Güncellemesi",
    priority: "Normal",
    color: "bg-emerald-100 text-emerald-700",
  },
];

export default function TodayPriorities() {
  return (
    <Card className="p-6">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            📋 Bugünün Öncelikleri
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Öncelikli İşler
          </h2>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {priorities.length} Görev
        </div>

      </div>

      <div className="mt-6 space-y-4">

        {priorities.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >

            <div>
              <h3 className="font-semibold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {item.action}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${item.color}`}
            >
              {item.priority}
            </span>

          </div>
        ))}

      </div>

    </Card>
  );
}