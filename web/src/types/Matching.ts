import type { Customer, Demand } from "./Customer";
import type { Portfolio } from "./Portfolio";

export type MatchReasonType = "positive" | "warning" | "neutral";

export interface MatchReason {
  type: MatchReasonType;
  title: string;
  detail: string;
}

export interface MatchScoreBreakdown {
  category: number;
  location: number;
  budget: number;
  size: number;
  features: number;
  preferences: number;
  availability: number;
  penalty: number;
}

export interface PropertyMatch {
  id: string;
  customer: Pick<Customer, "id" | "name" | "initials">;
  demand: Pick<Demand, "id" | "title" | "type" | "propertyType" | "locations" | "budget" | "size" | "rooms">;
  portfolio: Portfolio;
  score: number;
  breakdown: MatchScoreBreakdown;
  reasons: MatchReason[];
  nextAction: string;
}
