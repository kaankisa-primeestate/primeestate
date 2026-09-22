# PrimeEstate — Codex / Developer Handoff

> Bu dosya PrimeEstate'i devralan bir yazılımcının, özellikle Codex'in, başka bir konuşmaya ihtiyaç duymadan projeyi anlaması için hazırlanmıştır.
>
> **Kaynak gerçekliği:** Bu doküman 22.09.2026 tarihinde GitHub'daki `main`, ilgili PR'lar ve kaynak kod incelenerek hazırlanmıştır. `CURRENT_STATE.md` ve eski plan dosyaları geride kalabildiği için yeni oturumda önce gerçek GitHub durumunu doğrula.

## 1. Proje ve repo

- Ana geliştirme reposu: `kaankisa-primeestate/primeestate`
- Canlı/referans repo: `kaankisa-primeestate/remax-CRM`
- **`remax-CRM` kesinlikle değiştirilmez.**
- Tüm geliştirme PrimeEstate üzerinde yapılır.
- Ürün: gayrimenkule özel CRM + Office Operating System / SaaS.
- Temel prensip: **TEK VERİ, ÇOK FONKSİYON.**
- Aynı kayıt Dashboard, CRM, Portföy, Sales ve Finance tarafında tekrar üretilmemeli; tek PostgreSQL kaynağı kullanılmalı.

## 2. Mevcut GitHub durumu

### Main

Son doğrulanmış `main`:

`d8b95168d7b2e0d7580795eb8cf989a52e86ed25`

Bu commit PR #88'in merge commitidir.

- PR #80 — Phase 7 Critical E2E business chain
- customer → demand → listing → matching → showing → offer → accepted offer → sale → commission → payment → payment plan/installments

PR #80 merge edilmiş ve onun kritik E2E zinciri main'e alınmıştır.

### Son merge

PR #82 — Dashboard / Finance live verification — merged.
PR #84 — post-merge documentation reconciliation — merged.
PR #85 — final main state reconciliation — merged.
PR #88 — production release-gate smoke hardening — merged.

## 3. Production / Render

Production servis:

`primeestate`

Bilinen URL:

`https://primeestate-v9eo.onrender.com`

URL'deki `v9eo` bölümündeki karakter küçük `o`'dur.

Production deployment commit'i `/api/deployment-check` üzerinden doğrulanabilir.

Endpoint:

`GET /api/deployment-check`

Dönen önemli alanlar:

- render
- renderGitBranch
- renderGitCommit
- renderServiceName
- renderExternalUrl
- betterAuthUrl
- buildId

Production auth smoke, Render'ın gerçekten beklenen Git commit'ini çalıştırdığını kontrol eder.

**Render UI bu kod ortamından doğrudan yönetilemiyor.** Production deploy oldu iddiası yalnızca doğrulanmış GitHub smoke çıktısı veya kullanıcı tarafından sağlanan Render ekranı ile kabul edilir.

Render free instance'in uykuya geçmesi nedeniyle ilk isteğin gecikmesi normal olabilir.

## 4. Stack

- Next.js 16.2.12
- React 19.2.4
- TypeScript 5.x
- Prisma 7.10.0
- PostgreSQL / Neon uyumlu
- Better Auth 1.7.5
- @better-auth/prisma-adapter 1.7.5
- @prisma/adapter-pg 7.10.0
- Tailwind CSS 4
- Node >= 20.19.0

Ana uygulama:

`web/`

Prisma:

`web/prisma/`

Kaynak:

`web/src/`

Test:

`web/tests/`

CI:

`.github/workflows/`

## 5. npm komutları

`web/package.json`:

- `npm run dev` → Next dev
- `npm run build` → production build + build verification
- `npm run start` → Next production server
- `npm run lint`
- `npm run typecheck`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:deploy`
- `npm run db:migration:check`
- `npm test`

### Test komutunun önemli özelliği

`npm test` önce migration deploy eder, sonra Node test runner çalıştırır:

1. `node --test --test-concurrency=1 tests`
2. `tsx --test --test-concurrency=1` ile:
   - phase6.integration.test.ts
   - phase6.api.integration.test.ts
   - phase7.critical.e2e.test.ts

**`--test-concurrency=1` bilinçli ve zorunludur.**

Sebep: Phase 6 API ve Phase 7 E2E testleri çalışan Next.js dev server başlatıyor. Aynı anda iki test dosyası çalışınca aynı `web/.next` üzerinde Next.js dev lock çakışması oluştu:

`Another next dev server is already running.`

Bu daha önce CI'deki server readiness hatalarının gerçek kök nedenlerinden biri olarak doğrulandı.

## 6. Authentication

Temel dosyalar:

- `web/src/lib/auth.ts`
- `web/src/lib/auth-context.ts`
- `web/src/app/api/auth/[...all]/route.ts`

Better Auth:

- email/password açık
- sign-up kapalı
- minimum password 8
- maksimum 128
- password reset 1 saat
- reset sonrası session revoke
- Resend password-reset mail sağlayıcısı

Runtime secret:

`BETTER_AUTH_SECRET`

Runtime'da secret yoksa uygulamanın güvenli biçimde hata vermesi beklenir.

Session context:

`getUserContext()`

şunları döndürür:

```ts
{
  userId,
  organizationId,
  officeId,
  teamId,
  role
}
```

Session'daki user id PostgreSQL'deki gerçek `User` kaydıyla tekrar doğrulanır. Aktif olmayan kullanıcıya context verilmez.

## 7. Authorization

Roller:

- SUPER_ADMIN
- ORG_ADMIN
- OFFICE_ADMIN
- TEAM_LEADER
- AGENT
- VIEWER
- AUDITOR

Manager:

- SUPER_ADMIN
- ORG_ADMIN
- OFFICE_ADMIN

Capabilities:

- SUPER_ADMIN: read/create/update/delete/manage
- ORG_ADMIN: read/create/update/delete/manage
- OFFICE_ADMIN: read/create/update/delete/manage
- TEAM_LEADER: read/create/update
- AGENT: read/create/update
- VIEWER: read
- AUDITOR: read

Merkezi dosya:

`web/src/lib/authz.ts`

Önemli fonksiyonlar:

- `can()`
- `assertCan()`
- `customerOwnershipScope()`
- `canAssignCustomerOwner()`
- `officeListingScope()`
- `isManagerRole()`
- `isReadOnlyRole()`

### Müşteri görünürlük kuralı

Manager tüm kendi organization + office kapsamını görür.

Team Leader team kapsamını görür.

Agent yalnızca kendi `ownerUserId` müşterilerini görür.

Bir danışman başka danışmanın özel müşteri kaydını görmemelidir.

### Portföy görünürlük kuralı

Portföyler organization + office kapsamında ortaktır.

Danışmanlar ortak ofis portföyünü görebilir.

Bu ayrım müşteri verileri ile listing verilerinin aynı visibility kuralına sahip olmadığını gösterir.

### Yetki frontend'e bırakılmaz

API route'ları her kritik işlem öncesinde auth context + capability + tenant scope kontrol eder.

## 8. API response standardı

Temel helper:

`web/src/lib/api-response.ts`

Desteklenen hata kodları:

- AUTHENTICATION_REQUIRED
- FORBIDDEN
- NOT_FOUND
- VALIDATION_ERROR
- CONFLICT
- INTERNAL_ERROR

Yapı:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Yetkiniz yok."
  }
}
```

Başarı:

```json
{
  "ok": true,
  "data": {}
}
```

**Not:** Tüm eski API endpoint'lerinin tek biçime geçirilmesi henüz tamamlanmış değildir. Bazı eski route'lar halen doğrudan `NextResponse.json({ ... })` döndürüyor. Bu Phase 4 hardening teknik borcudur.

## 9. Veri modeli

Ana Prisma schema:

`web/prisma/schema.prisma`

### Organization

Tenant üst seviyesi.

İlişkiler:

- offices
- users
- customers
- properties
- listings
- auditLogs

### Office

Organization altındaki çalışma alanı.

### Team

Office altındaki ekip.

### User

Temel alanlar:

- organizationId
- officeId
- teamId
- email
- role
- active

### Customer

Ana CRM kişi kaydı.

Önemli alanlar:

- organizationId
- officeId
- ownerUserId
- name
- phone
- email
- relationshipScore
- lastContactAt
- nextAction
- nextActionAt
- notes

İlişkiler:

- roles
- demands
- activities
- tasks
- showings
- offers
- sales

### CustomerRole

ALICI, KIRACI, MAL_SAHIBI, SATICI, YATIRIMCI, LEAD, GECMIS_MUSTERI

### Demand

Müşteri talebi.

Önemli:

- type: SATIN_ALMA / KIRALAMA
- propertyType
- locations JSON
- budgetMin / budgetMax
- currency
- minSize / maxSize
- rooms
- urgency
- preferences JSON
- active

### Property

Gayrimenkulün ana fiziksel kaydı.

### Listing

Property'nin ilan/portföy kaydı.

- purpose: SATILIK / KIRALIK
- status:
  - AKTIF
  - REZERVE
  - PASIF
  - SATILDI
  - KIRALANDI
- price
- currency
- tags
- highlights
- featured
- consultantUserId

Ofis + kod unique:

`@@unique([officeId, code])`

### Match

Demand ↔ Property / Listing eşleşmesi.

- score
- breakdown JSON
- reasons JSON
- mismatches JSON

`@@unique([demandId, propertyId])`

### Activity

Müşteri aktivitesi.

Tipler:

- ARAMA
- WHATSAPP
- EMAIL
- NOT
- GOSTERIM
- TEKLIF

### Task

Görev.

Status:

- BEKLIYOR
- TAMAMLANDI
- GECIKTI

Priority:

- YUKSEK
- NORMAL
- DUSUK

### Showing

Gösterim:

- customerId
- listingId
- dateTime
- status
- attendees
- note

Status:

- PLANLANDI
- GERCEKLESTI
- IPTAL

### Offer

Teklif:

- customerId
- listingId
- amount
- currency
- status
- offeredAt
- nextAction

Status:

- TASLAK
- SUNULDU
- KARSILIKLI_TEKLIF
- KABUL
- REDDEDILDI

### Sale

Satış:

- customerId
- listingId
- offerId
- amount
- currency
- status
- closedAt
- note
- commissionRate
- grossCommission
- officeShareRate
- officeShare
- consultantShare

Kritik database kuralları:

`offerId @unique`

`@@unique([listingId])`

Bu, aynı accepted offer'ın iki satışa dönüşmesini ve aynı listing'in iki Sale kaydına bağlanmasını engeller.

Sale status:

- ACIK
- TAMAMLANDI
- IPTAL

### PaymentPlan

Sale başına tek plan:

`saleId @unique`

### PaymentInstallment

Plan altındaki taksit.

`@@unique([planId, sequence])`

### Payment

Sale tahsilatı:

- amount
- currency
- status
- paidAt
- note

Status:

- BEKLIYOR
- ODENDI
- IPTAL

### LedgerEntry

Cari/ledger:

- OFFICE
- CONSULTANT

Ödeme başına account unique:

`@@unique([paymentId, account])`

### AuditLog

Organizasyon bazlı işlem izi.

## 10. Kritik satış / finans iş kuralları

### Offer → Sale

Sadece accepted offer:

`Offer.status === KABUL`

Sale oluşturabilir.

Sale oluşturulduğunda listing:

`AKTIF → REZERVE`

olur.

### Sale kapanışı

Sale:

`ACIK → TAMAMLANDI`

olduğunda:

- SATILIK listing → SATILDI
- KIRALIK listing → KIRALANDI

### Sale iptali

Sale:

`ACIK → IPTAL`

olduğunda REZERVE listing tekrar AKTIF'e alınabilir.

### Komisyon

Formül:

`grossCommission = sale.amount × commissionRate / 100`

Sonra:

`officeShare = grossCommission × officeShareRate / 100`

`consultantShare = grossCommission - officeShare`

Tutarlar 2 ondalığa yuvarlanır.

### Finans immutable davranışı

Tahsilat gerçekleşmiş veya satış kapanmışsa komisyon oranı/pay oranı değiştirilmemelidir.

## 11. API route haritası

### Customers

- `/api/customers`
- `/api/customers/[id]`
- `/api/customers/[id]/demands`

### Listings

- `/api/listings`
- `/api/listings/[id]`
- `/api/listings/[id]/images`

### Matching

- `/api/matching`

### Showings

- `/api/showings`
- `/api/showings/[id]`

### Offers

- `/api/offers`
- `/api/offers/[id]`

### Sales

- `/api/sales`
- `/api/sales/[id]`

### Payments

- `/api/payments`
- `/api/payments/[id]`

### Payment Plans

- `/api/payment-plans`
- `/api/payment-installments/[id]`

### Tasks

- `/api/tasks`
- `/api/tasks/[id]`

### Activities

- `/api/activities`

### Users

- `/api/users`
- `/api/users/[id]`

### System

- `/api/health`
- `/api/deployment-check`
- `/api/auth/*`

## 12. Ana ekranlar

- `/login`
- `/dashboard`
- `/clients`
- `/relationships`
- `/relationship/[id]`
- `/portfolio`
- `/matching`
- `/sales`
- `/finance`
- `/finance/dashboard`
- `/calendar`
- `/calls`
- `/users`
- `/crm`
- `/health`
- `/forbidden`

## 13. Dashboard durumu

Ana dashboard bileşeni:

`web/src/components/DashboardLive.tsx`

Dashboard'un hedefi yalnızca statik KPI göstermek değildir.

Gerçek verilerden şu zinciri özetlemelidir:

Müşteri → Talep → Eşleşme → Gösterim → Teklif → Satış → Komisyon → Tahsilat

Aynı dashboard'da:

- müşteri sayısı
- aktif portföy
- açık fırsat
- açık satış
- görevler
- gösterimler
- son aktiviteler
- finans özeti
- tahsilatlar
- ödeme planları
- bekleyen / gecikmiş taksitler

gibi canlı metrikler gösterilebilir.

Dashboard finans özeti artık `/api/dashboard/finance-summary` aggregate endpoint'inden beslenir. Tenant/office/ownership scope korunur. Finans yenilemesi başarısız olursa son başarılı finans snapshot'ı korunur.

## 14. Finance durumu

`web/src/app/finance/page.tsx`

Finance mevcut olarak:

- payment kayıtları
- payment status
- currencies
- payment updates

ile çalışır.

Model tarafında:

Sale → Payment → Ledger

ve

Sale → PaymentPlan → PaymentInstallment

bağlantıları vardır.

Burada yeni geliştirme yapmadan önce gerçek production verisi ile:

- komisyon
- tahsilat
- ofis payı
- danışman payı
- ledger
- plan
- installment

eşleşmeleri doğrulanmalıdır.

## 15. Matching mimarisi

İki matching yaklaşımı vardır:

### Yeni / gerçek DB matching

`web/src/core/matching-engine.ts`

ve:

`web/src/app/api/matching/route.ts`

Gerçek Prisma modelleriyle çalışır.

Ağırlıklar:

- category: 20
- location: 25
- budget: 20
- size: 10
- features: 15
- preferences: 5
- availability: 5

Penalty uygulanabilir.

### Eski / UI type tabanlı matching

`web/src/core/matching.ts` (removed in Phase 8; no production-code references found)

Bu sistem `Customer`, `Demand`, `Portfolio` gibi eski front-end type'larıyla çalışır.

**Teknik borç:** duplicate matching engines vardır. Phase 8'de hangisinin kalacağı netleştirilmeli ve gereksiz olan emekliye ayrılmalıdır.

## 16. Prime Brain

`web/src/core/prime-brain/decision.ts`

Henüz ürünün tamamına yayılmış bir AI motoru değildir.

Tanımlı kavramlar:

- RelationshipHealth
- ActionType
- Priority
- Opportunity
- PrimeDecision

İleride CRM davranışlarını ve aksiyon önerilerini desteklemek için temel sözleşme görevi görüyor.

## 17. Phase 6 testleri

### `tests/authz.test.mjs`

Temel authorization policy testleri.

### `tests/phase6.integration.test.ts`

DB-backed:

- agent customer ownership isolation
- cross-office isolation
- cross-organization isolation
- shared office listing visibility
- accepted Offer ↔ Sale linkage
- Sale ↔ Listing uniqueness

### `tests/phase6.api.integration.test.ts`

Gerçek HTTP route handlers / running Next app üzerinden:

- unauthenticated customer route → 401
- agent owner isolation
- Team Leader team scope
- manager visibility
- cross-owner assignment deny
- VIEWER write deny
- Better Auth login/session

### Finans invariant testleri

- Payment ↔ Ledger office/consultant split
- PaymentPlan ↔ Installment currency/total/sequence
- duplicate PaymentPlan deny
- duplicate installment sequence deny

## 18. Phase 7 E2E testi

`tests/phase7.critical.e2e.test.ts`

Gerçek Next.js HTTP route'larını zincir halinde çalıştırır:

1. login
2. customer
3. demand
4. listing
5. matching
6. showing
7. offer
8. offer status transitions
9. accepted offer
10. sale
11. commission
12. payment
13. payment plan
14. installments
15. read-back

### Daha önce yaşanan Phase 7 hataları ve kök nedenleri

#### Hata 1 — Next.js readiness

Semptom:

`Phase 7 E2E Next.js test server did not become ready.`

Gerçek kök nedenlerden biri:

İki test dosyası aynı anda Next dev server başlattı ve `.next` dev lock çakıştı.

Çözüm:

`--test-concurrency=1`

ve server process cleanup.

#### Hata 2 — process cleanup

Next dev child process ağacı test sonunda açık kalıyordu.

Çözüm:

`stopServer(child)`

ve gerçek `after()` cleanup.

#### Hata 3 — Response body twice

Şu pattern problem yarattı:

```ts
assert.equal(response.status, 201, await response.text());
await response.json();
```

Body ikinci kez okununca:

`Body is unusable`

oluştu.

Çözüm:

Response body'yi bir kez okuyup reusable response object kullanmak.

#### Hata 4 — commission assertion

Bir süre:

`expectStatus(commissionResponse, 200, ...)`

üzerinden CI'da yalnızca false assertion mesajı görülüyordu.

Gerçek backend hatası loglarda görünür değildi.

Bu yüzden blind backend rewrite yapılmadı.

#### Hata 5 — listing query encoding

`Bostancı E2E 3+1`

query'sindeki `+` URL encoding yapılmadan kullanıldığında query parser bunu space olarak değerlendirebiliyordu.

Test tarafında:

`encodeURIComponent()`

kullanıldı.

#### Hata 6 — assertion loader güvenilmezliği

Node/tsx test loader altında bazı assertion failure'ları asıl eşitsizlik değerlerini göstermiyordu.

Testte deterministik local assertion kullanımıyla bu false-failure davranışı temizlendi.

**Önemli:** Bu tarihsel sorunlar PR #80'e kadar olan kritik zincirin yeşil hale gelmesini sağladı. Bunları tekrar çözmeye çalışma.

## 19. CI

### Web Quality

`.github/workflows/primeestate-web-quality.yml`

Sıra:

1. npm ci
2. Prisma shadow DB
3. migration parity
4. npm test
5. lint
6. typecheck
7. production build

### Critical Tests

`.github/workflows/primeestate-critical-tests.yml`

Ayrı critical gate.

### Production Auth Smoke

`.github/workflows/production-auth-smoke.yml`

- main push sonrası
- Render deployment commit doğrulaması
- production login/session/authorization smoke

### Prisma workflows

- `prisma-production-migrate.yml`
- `prisma-production-status.yml`
- `prisma-staging-migrate.yml`

### Current CI warning

GitHub Actions job log blob'ları bu çalışma ortamında bazen 404 dönebiliyor. Böyle bir durumda failure root cause görülmeden yeni kod yazmak **yasaktır**.

## 20. Migration geçmişi

`web/prisma/migrations/`

Bilinen 9 migration:

1. `20260919123000_init`
2. `20260919160000_better_auth_core`
3. `20260920220000_sales`
4. `20260920230000_listing_images`
5. `20260921070000_sale_commissions`
6. `20260921100000_payments_ledger`
7. `20260922080000_payment_plans`
8. `20260923090000_phase2_data_integrity`
9. `20260924080000_phase2_tenant_hierarchy`

Production database reset edilmez.

Migration deploy:

`npx prisma migrate deploy`

Migration state schema ile uyumlu kalmalıdır.

## 21. Bilinen teknik borçlar / sonraki işler

### Öncelikli

1. PR #82 current-main tabanında doğrulandı ve merge edildi.
2. Dashboard/Finance live verification tamamlandı.
3. Render'ın main commitini Production Auth Smoke ile doğrula.
4. CURRENT_STATE.md ve foundation planını gerçek main ile reconcile et.
5. Phase 8 cleanup.
6. Phase 9 release gate.

### Phase 8

- duplicate matching engines cleanup
- stale branches / obsolete PR cleanup
- CURRENT_STATE update
- recovery plan update
- migration/release procedure docs
- authorization matrix docs
- business status transition docs

### Phase 9

- main CI green
- migration parity green
- auth smoke green
- authorization matrix green
- critical E2E green
- health green
- Dashboard 500 yok
- Finance 500 yok
- CURRENT_STATE gerçek main ile eşleşiyor
- feature development serbest

## 22. Çok önemli çalışma kuralları

- `remax-CRM` repo'suna dokunma.
- Production DB resetleme.
- Secret isteme, loglama veya commit etme.
- CI kırmızı iken feature merge etme.
- Root cause görülmeden blind fix yapma.
- Çalışan sistemi gereksiz yere yeniden yazma.
- Authorization frontend'e bırakma.
- Tenant scope'u route seviyesinde uygula.
- Migration değişikliklerini plansız yapma.
- Test sonucunu gerçek durum gibi göstermek için varsayım kullanma.
- Bir test kırıldığında önce failure satırını ve ilgili endpoint'i izole et.
- E2E testleri gerçek route üzerinden çalıştır.
- Her iş sonunda main / branch / PR / CI durumunu tekrar kontrol et.

## 23. Codex için başlangıç talimatı

Aşağıdaki komutla devral:

```text
PrimeEstate'i devral.

Önce:
1. CODEX_PROJECT_HANDOFF.md
2. CURRENT_STATE.md
3. FOUNDATION_RECOVERY_PLAN.md
4. GitHub main
5. açık PR'lar
6. CI run'ları

kontrol et.

Kurallar:
- remax-CRM reposuna dokunma.
- CI kırmızıysa merge etme.
- root cause görmeden blind fix yapma.
- production DB resetleme.
- secret/connection string isteme veya yazma.

Öncelik:
PR #82'nin mevcut CI root cause'unu bul ve gereksiz eski branch geçmişini kullanma.
Log görünmüyorsa yeni kod değiştirmeden önce failure gözlemleme yöntemini kur.
Kök neden kanıtlanınca tek, temiz düzeltmeyi yap.
Critical Tests + Web Quality + typecheck + lint + build yeşil olmadan PR #81'i merge etme.

Sonra:
Dashboard → Finance → Render production verification → CURRENT_STATE reconciliation → Phase 8 → Phase 9.
```

## 24. Hızlı dosya rehberi

| Konu | Dosya |
|---|---|
| Prisma schema | `web/prisma/schema.prisma` |
| Auth | `web/src/lib/auth.ts` |
| Auth context | `web/src/lib/auth-context.ts` |
| Authz | `web/src/lib/authz.ts` |
| API error helpers | `web/src/lib/api-response.ts` |
| Page access | `web/src/lib/route-access.ts` |
| Prisma client | `web/src/lib/prisma.ts` |
| Dashboard | `web/src/components/DashboardLive.tsx` |
| CRM flow | `web/src/app/crm/page.tsx` |
| Customers | `web/src/app/clients/page.tsx` |
| Relationships | `web/src/app/relationships/page.tsx` |
| Portfolio | `web/src/app/portfolio/page.tsx` |
| Matching UI | `web/src/app/matching/page.tsx` |
| Sales UI | `web/src/app/sales/page.tsx` |
| Finance UI | `web/src/app/finance/page.tsx` |
| Finance dashboard | `web/src/app/finance/dashboard/page.tsx` |
| Matching engine | `web/src/core/matching-engine.ts` |
| Legacy matching | `web/src/core/matching.ts` |
| Prime Brain | `web/src/core/prime-brain/decision.ts` |
| Phase 6 DB tests | `web/tests/phase6.integration.test.ts` |
| Phase 6 API tests | `web/tests/phase6.api.integration.test.ts` |
| Phase 7 E2E | `web/tests/phase7.critical.e2e.test.ts` |
| CI | `.github/workflows/` |
| Current state | `CURRENT_STATE.md` |
| Foundation plan | `FOUNDATION_RECOVERY_PLAN.md` |

---

# Son durum özeti

**Main:** `d8b95168d7b2e0d7580795eb8cf989a52e86ed25`

**PR #80:** merged ✅

**PR #81:** closed / obsolete

**Production Render:** `2aca0b1` üzerinde auth, session, customers, health, Dashboard, Finance, listings, sales, payments ve payment plans doğrulandı.

**remax-CRM:** dokunulmayacak.

**Yeni ürün özelliği geliştirme:** foundation release gate koşulları doğrulandıktan sonra açılabilir.
