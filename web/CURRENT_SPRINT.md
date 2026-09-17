# 🏡 PRIME01

## Sprint
Matching Engine V1

## Durum
✅ Completed

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
- [x] Portfolio domain model and seed data
- [x] Portfolio list/search/filter workspace
- [x] Portfolio detail workspace
- [x] Matching domain types (`PropertyMatch`, `MatchScoreBreakdown`, `MatchReason`)
- [x] Deterministic matching engine V1
- [x] 0–100 explainable compatibility score
- [x] Weighted scoring: type, location, budget, m², features, preferences, availability
- [x] Strong mismatch penalty for incompatible property type / budget risk
- [x] Customer → Demand → Portfolio → Score → Reason → Next Action flow
- [x] Matching workspace with customer/demand selection and filters
- [x] Matching navigation entry

## Bu Aşamanın Amacı

Müşteri talebini mevcut portföylerle tek veri üzerinden eşleştirmek ve danışmana yalnızca bir skor değil, skorun nedenini ve önerilen sonraki aksiyonu göstermek.

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Sonraki Adım

Sales Ops V1: Activity → Task → Showing → Offer/Deal zincirini kurmak ve eşleşmeden aksiyona geçişi gerçek bir operasyon akışına dönüştürmek.

## Teknik Not

Bu sprintte eşleştirme motoru saf TypeScript fonksiyonu olarak kuruldu; müşteri, talep ve portföy seed verileri üzerinden deterministik çalışıyor. Gerçek persistence, auth/RBAC ve API bağlantısı sonraki foundation aşamalarında eklenecek. V1 ekranı bunlar varmış gibi göstermiyor.

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
