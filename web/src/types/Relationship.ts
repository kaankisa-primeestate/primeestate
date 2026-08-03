export interface Relationship {
  id: number;
  name: string;
  relationshipScore: number;
  lastContact: string;
  nextAction: string;
  priority: "A" | "B" | "C";
}