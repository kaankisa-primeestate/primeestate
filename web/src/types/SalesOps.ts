export type ActivityType = "Arama" | "WhatsApp" | "E-posta" | "Not" | "Gösterim" | "Teklif";
export type TaskStatus = "Bekliyor" | "Tamamlandı" | "Gecikti";
export type ShowingStatus = "Planlandı" | "Gerçekleşti" | "İptal";
export type OfferStatus = "Taslak" | "Sunuldu" | "Karşı teklif" | "Kabul" | "Reddedildi";

export interface Activity {
  id: number;
  type: ActivityType;
  customerId: number;
  customerName: string;
  portfolioId?: number;
  portfolioTitle?: string;
  date: string;
  summary: string;
  outcome: string;
  owner: string;
}

export interface SalesTask {
  id: number;
  title: string;
  customerId: number;
  customerName: string;
  due: string;
  priority: "Yüksek" | "Normal" | "Düşük";
  status: TaskStatus;
  source: string;
}

export interface Showing {
  id: number;
  customerId: number;
  customerName: string;
  portfolioId: number;
  portfolioTitle: string;
  date: string;
  time: string;
  status: ShowingStatus;
  attendees: number;
  note?: string;
}

export interface Offer {
  id: number;
  customerId: number;
  customerName: string;
  portfolioId: number;
  portfolioTitle: string;
  amount: number;
  amountLabel: string;
  date: string;
  status: OfferStatus;
  nextAction: string;
}

export interface SalesOpsSummary {
  activities: Activity[];
  tasks: SalesTask[];
  showings: Showing[];
  offers: Offer[];
}
