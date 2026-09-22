"use client";

import { use } from "react";
import RelationshipLive from "@/components/RelationshipLive";

export default function RelationshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RelationshipLive customerId={id} />;
}
