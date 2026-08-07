import Link from "next/link";

const menu = [
  { name: "Dashboard", href: "/", icon: "🏠" },
  { name: "İlişkiler", href: "/relationships", icon: "🤝" },
  { name: "Portföyler", href: "/portfolio", icon: "🏡" },
  { name: "Takvim", href: "/calendar", icon: "📅" },
  { name: "Müşteriler", href: "/clients", icon: "👤" },
  { name: "Aramalar", href: "/calls", icon: "📞" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">

      <div className="border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          🏡 PrimeEstate
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Relationship Workspace
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">

        <ul className="space-y-2">

          {menu.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span className="text-lg">{item.icon}</span>

                <span className="font-medium">
                  {item.name}
                </span>
              </Link>
            </li>
          ))}

        </ul>

      </nav>

      <div className="border-t border-slate-200 p-5">

        <div className="rounded-xl bg-slate-100 p-4">

          <p className="text-xs uppercase tracking-wide text-slate-500">
            Prime01
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            Relationship First
          </p>

        </div>

      </div>

    </aside>
  );
}