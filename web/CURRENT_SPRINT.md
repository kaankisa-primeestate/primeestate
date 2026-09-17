# 🏡 PRIME01

## Sprint
Sales Ops V1

## Durum
🚧 Development complete · Review pending

## Ürün Vizyonu

PrimeEstate bir CRM değildir.

Prime, emlak danışmanının ikinci beynidir.

**Temel İlke:**

> Prime hatırlar. Prime düşünür. Prime önerir. Sen ilişki kurarsın.

---

## Tamamlananlar

- [x] Responsive PrimeEstate global design foundation
- [x] Dashboard workspace V1
- [x] Relationship Workspace V1
- [x] Customer + Demand Workspace V1
- [x] Portfolio Workspace V1
- [x] Matching Engine V1
- [x] Sales Ops domain types: Activity, Task, Showing, Offer
- [x] Sales Ops seed workflow
- [x] Activity timeline
- [x] Task queue with status transition preview
- [x] Showing workspace with customer + portfolio relationship
- [x] Offer workspace with amount, status and next action
- [x] Eşleşme → Aktivite → Görev → Gösterim → Teklif zinciri
- [x] Mobile-first responsive Sales Ops workspace

## Bu Aşamanın Amacı

Eşleştirme sonucunu yalnızca bir öneri olarak bırakmamak; danışmanın gerçek operasyonunu aynı müşteri–portföy bağlamı üzerinde ilerletmek.

**Temel akış:**

> Müşteri → Talep → Eşleşme → Aktivite → Görev → Gösterim → Teklif → Kapanış

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Sonraki Adım

Foundation V1: gerçek persistence + PostgreSQL veri modeli + API katmanı + auth/RBAC + tenant izolasyonu. Ardından Sales Ops ekranındaki seed verileri gerçek kayıtlara bağlanacak.

## Teknik Not

Bu sprintte Sales Ops domain katmanı tipli seed veri ve responsive workspace olarak hazırlandı. Görev tamamlandı durumu gibi etkileşimler ekran önizlemesidir; henüz kalıcı değildir. Gerçek persistence, auth/RBAC ve API bağlantısı sonraki foundation aşamasında eklenecek. V1 ekranı bunlar varmış gibi göstermiyor.

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
