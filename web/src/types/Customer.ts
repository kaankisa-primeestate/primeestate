export type CustomerRole =
  | "Alıcı"
  | "Kiracı"
  | "Mal Sahibi"
  | "Satıcı"
  | "Yatırımcı"
  | "Lead"
  | "Geçmiş Müşteri";

export type DemandType = "Satın Alma" | "Kiralama";

export interface Demand {
  id: number;
  title: string;
  type: DemandType;
  propertyType: string;
  locations: string[];
  budget: string;
  size: string;
  rooms: string;
  urgency: "Yüksek" | "Normal" | "Düşük";
  updatedAt: string;
  notes?: string;
}

export interface Customer {
  id: number;
  name: string;
  initials: string;
  phone: string;
  email: string;
  location: string;
  roles: CustomerRole[];
  relationshipScore: number;
  lastContact: string;
  nextAction: string;
  nextActionDate: string;
  source: string;
  owner: string;
  demands: Demand[];
}
