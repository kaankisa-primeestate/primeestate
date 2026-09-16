import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import TodaysFocus from "@/components/TodaysFocus";
import TodayPriorities from "@/components/TodayPriorities";
import MorningBrief from "@/components/MorningBrief";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              PrimeEstate Workspace
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Günaydın, Kaan.
                </h1>
                <p className="mt-2 text-slate-500">
                  Bugün ilişkilerini, fırsatlarını ve işlerini tek yerden yönet.
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                Prime01 • Workspace V1
              </span>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard emoji="👥" title="Aktif İlişkiler" value="128" />
            <StatCard emoji="🏡" title="Aktif Portföy" value="42" />
            <StatCard emoji="🎯" title="Bugünkü Öncelik" value="3" />
            <StatCard emoji="🔥" title="Sıcak Fırsatlar" value="8" />
          </section>

          <section className="mt-8">
            <TodaysFocus />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <TodayPriorities />
            <MorningBrief />
          </section>
        </div>
      </main>
    </div>
  );
}
