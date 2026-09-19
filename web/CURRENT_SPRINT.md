# 🏡 PRIME01

## Sprint
Foundation V1 · PostgreSQL Data Model

## Durum
🚧 Step 3 · Database provisioning + staging migration pending

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
- [x] PostgreSQL Prisma schema
- [x] Prisma 7 PostgreSQL dependencies and ESM foundation
- [x] Prisma Client singleton
- [x] Database health endpoint: /api/health
- [x] Database connection is kept out of source control

## Bu Aşamanın Amacı

Ekranları gerçek PostgreSQL verisine bağlamak ve PrimeEstate'in ilk gerçek persistence katmanını oluşturmak.

**Temel akış:**

> Müşteri → Talep → Eşleşme → Portföy → Aktivite → Görev → Gösterim → Teklif → Kapanış

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Mevcut Durum

Uygulama tarafında PostgreSQL/Prisma bağlantı katmanı hazırlandı.

- Prisma schema mevcut.
- Prisma Client üretimi build/postinstall akışına bağlandı.
- /api/health gerçek database bağlantısını test edecek şekilde hazır.
- DATABASE_URL GitHub'a yazılmıyor.
- Gerçek migration henüz çalıştırılmadı.
- Staging PostgreSQL henüz provision edilmedi.

## Sonraki Adım

Staging için ayrı bir PostgreSQL veritabanı oluşturmak, DATABASE_URL değerini yalnızca Render Environment Variables'a eklemek, ilk migration'ı uygulamak ve /api/health üzerinden bağlantıyı doğrulamak.

**Production veritabanına reset veya rastgele migration çalıştırılmayacaktır.**

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
