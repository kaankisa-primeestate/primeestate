# 🏡 PRIME01

## Sprint
Foundation V1 · PostgreSQL + Authentication + Production Build Hardening

## Durum
🚧 Step 4B · CI quality gate + production route verification

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
- [x] Web lint + typecheck + production build quality gate configured
- [x] Foundation audit and decision log added
- [x] React/ESLint foundation errors fixed in commit 9576cfc

## Bu Aşamanın Amacı

Ekranları gerçek PostgreSQL verisine bağlamadan önce üretim build zincirini ve route serving katmanını kanıtlamak.

**Temel akış:**

> Müşteri → Talep → Eşleşme → Portföy → Aktivite → Görev → Gösterim → Teklif → Kapanış

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Mevcut Durum

- Prisma schema mevcut.
- Prisma Client üretimi build/postinstall akışına bağlı.
- /api/health gerçek database bağlantısını test edecek şekilde hazır.
- DATABASE_URL GitHub'a yazılmıyor.
- İlk PostgreSQL migration staging'e uygulanmış durumda.
- Better Auth için gerekli session/account/verification tabloları staging migration'ına eklendi.
- BETTER_AUTH_SECRET ve BETTER_AUTH_URL Render runtime config olarak tanımlı.
- İlk gerçek kullanıcı bootstrap'i henüz yapılmadı.
- CI quality gate'in son lint düzeltmesi sonrası yeni doğrulaması bekleniyor.
- package.json ile package-lock.json arasında eski bir lockfile descriptor uyumsuzluğu tespit edildi; gerçek bağımlılık grafiğiyle senkronize edilmeden bu aşama tamamlanmış sayılmayacak.
- Production runtime route serving, build artefact doğrulamasından sonra Render üzerinde ayrıca doğrulanacak.

## Sonraki Adım

1. CI lint → typecheck → production build zincirini yeşile geçirmek.
2. package-lock.json'u package.json ile gerçek bağımlılık grafiği üzerinden senkronize etmek.
3. Production App Router manifestinde /api/health, /api/auth-context ve Better Auth catch-all route'larını doğrulamak.
4. Render runtime'da 404 yerine beklenen HTTP/JSON cevaplarını doğrulamak.
5. Sonrasında ilk Office/Admin bootstrap ve gerçek authorization enforcement katmanına geçmek.

**Production veritabanına reset veya rastgele migration çalıştırılmayacaktır.**

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
