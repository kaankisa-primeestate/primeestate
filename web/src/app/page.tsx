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
      <div className="mx-auto max-w-7xl p-8">

        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Dashboard'a Dön
        </Link>

        <RelationshipHeader />

        <div className="mt-8 grid gap-8">

          <PersonSummary />

          <PrimeMemory />

          <ConversationPlan />

          <div className="grid gap-8 lg:grid-cols-2">

            <Timeline />

            <Notes />

          </div>

        </div>

      </div>
    </main>
  );
}