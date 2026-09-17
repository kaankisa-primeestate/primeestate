import type { SalesOpsSummary } from "../types/SalesOps";

export const salesOps: SalesOpsSummary = {
  activities: [
    { id: 1, type: "Arama", customerId: 1, customerName: "Ahmet Yılmaz", portfolioId: 1, portfolioTitle: "Caddebostan'da Deniz Manzaralı 3+1", date: "Bugün · 09:40", summary: "Fiyat ve yatırım geri dönüşü konuşuldu.", outcome: "Gösterim için uygun gün bekleniyor.", owner: "Kaan Kısa" },
    { id: 2, type: "WhatsApp", customerId: 4, customerName: "Selin Arslan", portfolioId: 5, portfolioTitle: "Küçükyalı Sahil'de Yüksek Giriş 2+1", date: "Dün · 16:20", summary: "Yeni portföy gönderildi.", outcome: "Müşteri dönüşü bekleniyor.", owner: "Elif Kaya" },
    { id: 3, type: "Not", customerId: 2, customerName: "Ayşe Demir", portfolioId: 2, portfolioTitle: "Bostancı Metro Yakını Yeni 3+1", date: "Dün · 11:05", summary: "Banka finansmanı için ön görüşme notu.", outcome: "Teklif öncesi bütçe teyidi gerekli.", owner: "Elif Kaya" },
    { id: 4, type: "E-posta", customerId: 1, customerName: "Ahmet Yılmaz", portfolioId: 2, portfolioTitle: "Bostancı Metro Yakını Yeni 3+1", date: "16 Eyl · 18:10", summary: "Alternatif portföy bilgileri paylaşıldı.", outcome: "2 portföy favoriye alındı.", owner: "Kaan Kısa" },
  ],
  tasks: [
    { id: 101, title: "Ahmet'i ara ve gösterim günü netleştir", customerId: 1, customerName: "Ahmet Yılmaz", due: "Bugün · 18:30", priority: "Yüksek", status: "Bekliyor", source: "Eşleşme #PR-2401" },
    { id: 102, title: "Ayşe'nin bütçe teyidini al", customerId: 2, customerName: "Ayşe Demir", due: "Bugün · 14:00", priority: "Yüksek", status: "Bekliyor", source: "Teklif öncesi" },
    { id: 103, title: "Selin'e alternatif kiralıkları gönder", customerId: 4, customerName: "Selin Arslan", due: "Yarın · 10:00", priority: "Normal", status: "Bekliyor", source: "Talep 401" },
    { id: 104, title: "Mehmet ile fiyat görüşmesini kaydet", customerId: 3, customerName: "Mehmet Kaya", due: "Dün · 17:00", priority: "Normal", status: "Gecikti", source: "Portföy PR-2401" },
  ],
  showings: [
    { id: 201, customerId: 1, customerName: "Ahmet Yılmaz", portfolioId: 1, portfolioTitle: "Caddebostan'da Deniz Manzaralı 3+1", date: "18 Eyl 2026", time: "18:30", status: "Planlandı", attendees: 2, note: "Yatırım amacı ve kira potansiyeli özellikle anlatılacak." },
    { id: 202, customerId: 2, customerName: "Ayşe Demir", portfolioId: 2, portfolioTitle: "Bostancı Metro Yakını Yeni 3+1", date: "19 Eyl 2026", time: "11:00", status: "Planlandı", attendees: 3, note: "Banka ön onayı bekleniyor." },
    { id: 203, customerId: 4, customerName: "Selin Arslan", portfolioId: 5, portfolioTitle: "Küçükyalı Sahil'de Yüksek Giriş 2+1", date: "15 Eyl 2026", time: "15:30", status: "Gerçekleşti", attendees: 2, note: "Müşteri 3+1 alternatif istedi." },
  ],
  offers: [
    { id: 301, customerId: 2, customerName: "Ayşe Demir", portfolioId: 2, portfolioTitle: "Bostancı Metro Yakını Yeni 3+1", amount: 12600000, amountLabel: "12.600.000 TL", date: "16 Eyl 2026", status: "Sunuldu", nextAction: "Mal sahibi geri dönüşü" },
    { id: 302, customerId: 1, customerName: "Ahmet Yılmaz", portfolioId: 1, portfolioTitle: "Caddebostan'da Deniz Manzaralı 3+1", amount: 14250000, amountLabel: "14.250.000 TL", date: "14 Eyl 2026", status: "Karşı teklif", nextAction: "Karşı teklif görüşmesi" },
  ],
};
