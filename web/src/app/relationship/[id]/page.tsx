import Link from "next/link";

import RelationshipHeader from "@/components/RelationshipHeader";
import PrimeMemory from "@/components/PrimeMemory";
import Timeline from "@/components/Timeline";
import Notes from "@/components/Notes";
import ConversationPlan from "@/components/ConversationPlan";

export default function RelationshipPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-7xl p-8">

        {/* Back */}

        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Dashboard'a Dön
        </Link>

        {/* Header */}

        <RelationshipHeader />

        {/* Prime Insight */}

        <div className="mt-8">
          <PrimeMemory />
        </div>

        {/* Content */}
        <Notes />

            <div className="mt-8">

              <ConversationPlan />

            </div>

          </div>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-3">

          <div className="xl:col-span-2">

            <Timeline />

          </div>

          <div>

            

        </div>

      </div>

    </main>
  );
}