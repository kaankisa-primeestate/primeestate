export type PortfolioStatus = "Aktif" | "Rezerve" | "Pasif" | "Satıldı" | "Kiralandı";
export type PortfolioPurpose = "Satılık" | "Kiralık";
export type PropertyType = "Daire" | "Villa" | "Arsa" | "İş Yeri" | "Bina" | "Devre Mülk";

export interface Portfolio {
  id: number;
  code: string;
  title: string;
  purpose: PortfolioPurpose;
  propertyType: PropertyType;
  status: PortfolioStatus;
  price: string;
  priceValue: number;
  currency: "TRY" | "USD" | "EUR";
  size: string;
  rooms: string;
  floor: string;
  location: string;
  district: string;
  neighborhood: string;
  owner: string;
  ownerId: number;
  consultant: string;
  consultantInitials: string;
  updatedAt: string;
  listedAt: string;
  featured: boolean;
  tags: string[];
  highlights: string[];
  demandMatches: number;
  lastActivity: string;
  note?: string;
}
