import Sidebar from "../components/Sidebar";
import MorningBrief from "../components/MorningBrief";
import TodayPriorities from "../components/TodayPriorities";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 p-8">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              🏡 PrimeEstate
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              📅 1 Ağustos Cumartesi
            </p>
          </div>

          <MorningBrief />
        </header>

        {/* Greeting */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Günaydın Kaan 👋
          </h2>

          <p className="mt-3 text-lg text-slate-600">
            <strong>Harika bir destekçin yanında.</strong>
            <br />
            Bugün önemli hiçbir şeyi kaçırmayacaksın.
          </p>
        </section>

        {/* Bugünün Öncelikleri */}
        <TodayPriorities />

      </div>
    </main>
  );
}