import Link from "next/link";

import RelationshipHeader from "@/components/RelationshipHeader";
import PersonSummary from "@/components/PersonSummary";
import PrimeMemory from "@/components/PrimeMemory";
import ConversationPlan from "@/components/ConversationPlan";
import Timeline from "@/components/Timeline";
import Notes from "@/components/Notes";

export default function RelationshipPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Dashboard
          </Link>

          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            İlişki Workspace
          </span>
        </div>

        <div className="mt-5">
          <RelationshipHeader />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PersonSummary />
          </div>
          <PrimeMemory />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ConversationPlan />
          <Notes />
        </div>

        <div className="mt-6">
          <Timeline />
        </div>
      </div>
    </main>
  );
}
