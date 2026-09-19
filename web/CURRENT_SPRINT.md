# 🏡 PRIME01

## Sprint
Foundation V1 · PostgreSQL Data Model

## Durum
🚧 Step 2 · Data model complete, database connection pending

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

PostgreSQL bağlantısını staging ortamında sağlamak, ilk migration'ı uygulamak ve gerçek Customer/Property/Listing/Demand kayıtlarını API üzerinden persist etmek. Ardından auth/RBAC + tenant izolasyonuna geçilecek.

## Teknik Not

Step 2 kapsamında PostgreSQL hedef şeması, Prisma yapılandırması ve veri modeli dokümantasyonu eklendi. Canlı/staging DATABASE_URL henüz repo içinde tutulmuyor ve migration production'a uygulanmadı. Gerçek persistence bir sonraki adımda staging veritabanı ile doğrulanacak.

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
