import Card from "../ui/Card";

const events = [
  {
    date: "26 Haziran",
    title: "Telefon Görüşmesi",
    description: "Yeni portföy hakkında kısa görüşme yapıldı.",
  },
  {
    date: "18 Haziran",
    title: "Kahve Buluşması",
    description: "Bostancı'da yaklaşık 1 saat görüşüldü.",
  },
  {
    date: "12 Haziran",
    title: "WhatsApp Mesajı",
    description: "Doğum günü kutlama mesajı gönderildi.",
  },
];

export default function Timeline() {
  return (
    <Card className="p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            📅 TIMELINE
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            İlişki Geçmişi
          </h2>

        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {events.length} Kayıt
        </div>

      </div>

      <div className="mt-8 space-y-6">

        {events.map((event, index) => (

          <div
            key={index}
            className="flex gap-5"
          >

            <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />

            <div className="flex-1 border-b border-slate-100 pb-5">

              <p className="text-xs uppercase tracking-wide text-slate-400">
                {event.date}
              </p>

              <h3 className="mt-1 font-semibold text-slate-900">
                {event.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {event.description}
              </p>

            </div>

          </div>

        ))}

      </div>

    </Card>
  );
}