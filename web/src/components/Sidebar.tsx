export default function Sidebar() {
  return (
    <aside className="h-screen w-64 border-r border-slate-200 bg-white p-6">

      <h1 className="mb-8 text-2xl font-bold">
        🏡 PrimeEstate
      </h1>

      <nav className="space-y-2">

        <a className="block rounded-lg bg-slate-100 px-4 py-3 font-medium">
          🏠 Dashboard
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          🤝 İlişkiler
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          🏡 Portföyler
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          👥 Müşteriler
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          📞 Aramalar
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          📅 Takvim
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          📊 Performans
        </a>

        <a className="block rounded-lg px-4 py-3 hover:bg-slate-100">
          ⚙️ Ayarlar
        </a>

      </nav>

    </aside>
  );
}