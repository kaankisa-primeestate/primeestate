# 🏡 PRIME01

## Sprint
Foundation V1 · PostgreSQL + Authentication + Production Build Hardening

## Durum
🚧 Step 4B · Foundation verification

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
- [x] Better Auth + Prisma adapter configured
- [x] Auth session/account/verification schema added
- [x] Protected tenant-aware user context helper added
- [x] Auth API mounted at /api/auth/[...all]
- [x] Protected context probe added at /api/auth-context
- [x] Production build pinned to Webpack
- [x] Clean production build before each build
- [x] Production App Router route manifest verification
- [x] Web lint + typecheck + production build quality gate
- [x] Foundation audit and decision log added

## Bu Aşamanın Amacı

Ekranları gerçek PostgreSQL verisine bağlamak ve PrimeEstate'in ilk gerçek persistence katmanını oluşturmak.

**Temel akış:**

> Müşteri → Talep → Eşleşme → Portföy → Aktivite → Görev → Gösterim → Teklif → Kapanış

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Mevcut Durum

Uygulama tarafında PostgreSQL/Prisma bağlantı katmanı ve kimlik doğrulama temeli hazırlandı.

- Prisma schema mevcut.
- Prisma Client üretimi build/postinstall akışına bağlandı.
- /api/health gerçek database bağlantısını test edecek şekilde hazır.
- DATABASE_URL GitHub'a yazılmıyor.
- İlk PostgreSQL migration staging'e uygulanmış durumda.
- Better Auth için gerekli session/account/verification tabloları migration'a eklendi.
- BETTER_AUTH_SECRET ve BETTER_AUTH_URL Render'da runtime secret/config olarak tanımlanmalı.
- İlk gerçek kullanıcı bootstrap'i henüz yapılmadı.

## Sonraki Adım

Önce production build artefact'larının route'ları gerçekten içerdiğini kalite kapısından geçirmek; ardından Render runtime route serving'i doğrulamak. Sonrasında ilk Office/Admin kullanıcısı bootstrap edilecek ve gerçek authorization enforcement katmanı kurulacak.

**Production veritabanına reset veya rastgele migration çalıştırılmayacaktır.**

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
