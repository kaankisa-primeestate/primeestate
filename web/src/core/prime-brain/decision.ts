export type RelationshipHealth = "strong" | "normal" | "risk";

export type ActionType =
  | "call"
  | "meeting"
  | "whatsapp"
  | "email"
  | "wait";

export type Priority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export interface Opportunity {
  id: string;
  title: string;
  matchScore: number;
  reason: string;
}

export interface PrimeDecision {
  client: {
    id: string;
    name: string;
    relationshipHealth: RelationshipHealth;
  };

  objective: string;

  today: {
    action: ActionType;
    priority: Priority;
    confidence: number;
  };

  reasons: string[];

  talkingPoints: string[];

  opportunities: Opportunity[];

  risks: string[];

  expectedOutcome: string;

  nextStep: string;
}