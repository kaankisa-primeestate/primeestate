import Card from "../ui/Card";

const notes = [
  {
    date: "26 Haziran",
    text: "Yeni portföy hakkında oldukça ilgiliydi. Önümüzdeki hafta tekrar görüşmek istiyor.",
  },
  {
    date: "18 Haziran",
    text: "Kahve buluşmasında ailece Caddebostan'a taşınmayı düşündüklerini söyledi.",
  },
  {
    date: "10 Haziran",
    text: "Yaz sonunda yatırım amaçlı ikinci bir daire almayı planlıyor.",
  },
];

export default function Notes() {
  return (
    <Card className="p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            📝 NOTLAR
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            İlişki Notları
          </h2>

        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {notes.length} Not
        </div>

      </div>

      <div className="mt-6 space-y-4">

        {notes.map((note, index) => (

          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >

            <p className="text-xs uppercase tracking-wide text-slate-400">
              {note.date}
            </p>

            <p className="mt-2 leading-7 text-slate-700">
              {note.text}
            </p>

          </div>

        ))}

      </div>

      <button className="mt-6 w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">
        + Yeni Not Ekle
      </button>

    </Card>
  );
}