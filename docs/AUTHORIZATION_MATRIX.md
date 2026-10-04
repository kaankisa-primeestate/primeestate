# PrimeEstate — Authorization Matrix

## 1. Kimlik ve rol karşılığı

PrimeEstate oturum kimliğini Better Auth üzerinden alır. Backend, her kritik istekte session + organization + office + rol + veri kapsamını server-side doğrular.

| İş rolü | Teknik rol | Ana kapsam |
|---|---|---|
| Broker / Ofis yöneticisi | `OFFICE_ADMIN` | Kendi ofisi |
| Organizasyon yöneticisi | `ORG_ADMIN` | Organizasyon |
| Sistem yöneticisi | `SUPER_ADMIN` | Sistem/organizasyon yönetimi |
| Takım lideri | `TEAM_LEADER` | Kendi takımı + ortak ofis portföyü |
| Danışman | `AGENT` | Kendi müşteri kayıtları + ortak ofis portföyü |
| Görüntüleyici | `VIEWER` | Salt okunur, kendi müşteri kapsamı |
| Denetçi | `AUDITOR` | Salt okunur, kendi müşteri kapsamı |

> **Önemli:** `can()` rolün temel capability seviyesini belirler. Gerçek erişim bununla bitmez. Route handler ayrıca tenant, ownership/team ve iş kuralı kontrollerini uygular.
>
> **Silme notu:** `Delete` capability'si manager seviyesinde tanımlı olsa da core business kayıtları için uygulama route'larında hard-delete endpoint'i bulunmaz. Core kayıtların tarihçesi korunur; yalnızca operasyonel medya gibi açıkça tanımlanmış alt kayıtlar silinebilir.

## 2. Temel capability matrisi

| Rol | Read | Create | Update | Delete | Manage |
|---|---:|---:|---:|---:|---:|
| SUPER_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| ORG_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| OFFICE_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| TEAM_LEADER | ✓ | ✓ | ✓ | — | — |
| AGENT | ✓ | ✓ | ✓ | — | — |
| VIEWER | ✓ | — | — | — | — |
| AUDITOR | ✓ | — | — | — | — |

Kaynağın tek policy dosyası: `web/src/lib/authz.ts`

## 3. Veri kapsamı matrisi

| Veri alanı | SUPER_ADMIN / ORG_ADMIN / OFFICE_ADMIN | TEAM_LEADER | AGENT | VIEWER / AUDITOR |
|---|---|---|---|---|
| Müşteriler | Organization/office yetki kapsamı | Aynı takımın müşterileri | Yalnızca kendi müşterileri | Yalnızca kendi müşteri kapsamı |
| Demand | Aynı müşteri kapsamı | Aynı müşteri kapsamı | Kendi müşterileri | Kendi müşteri kapsamı |
| Aktivite | Aynı müşteri kapsamı | Aynı müşteri kapsamı | Kendi müşterileri | Kendi müşteri kapsamı |
| Görev | Yönetim kapsamı | Kendi kullanıcı/takım çalışma kapsamı | Kendi görevleri | Yazma yok |
| Portföy | Office/org kapsamı | Tüm ortak ofis portföyü | Tüm ortak ofis portföyü | Tüm ortak ofis portföyü |
| Gösterim | İlgili müşteri + portföy kapsamı | Aynı takım/müşteri + ortak portföy | Kendi müşteri + ortak portföy | Salt okuma, yetkili kapsam |
| Teklif | İlgili müşteri + portföy kapsamı | Aynı takım/müşteri + ortak portföy | Kendi müşteri + ortak portföy | Salt okuma, yetkili kapsam |
| Satış | Yetkili müşteri/ofis kapsamı | Takım/müşteri kapsamı | Kendi müşteri kapsamı | Salt okuma, yetkili kapsam |
| Tahsilat | Yetkili satış kapsamı | Takım/satış kapsamı | Kendi müşteri/satış kapsamı | Salt okuma, yetkili kapsam |
| Kullanıcılar | Organization yönetim kapsamı | Erişim yok | Erişim yok | Erişim yok |
| Platform sayfası | SUPER_ADMIN | — | — | — |

### Müşteri sahipliği

Merkezi kural `customerOwnershipScope()` ile uygulanır:

- Manager rolleri: ek owner filtresi yok; tenant kapsamı korunur.
- TEAM_LEADER: `owner.teamId = context.teamId`.
- AGENT / VIEWER / AUDITOR: `ownerUserId = context.userId`.

Bu nedenle bir danışmanın özel müşteri kaydı başka bir danışmana office-wide açılmaz.

### Portföy görünürlüğü

`officeListingScope()` yalnızca:

`organizationId + officeId`

ile sınırlar.

Bu nedenle aynı ofisteki danışmanlar ortak ofis portföyünü görebilir. Portföyü düzenleme ve fotoğraf silme gibi işlemlerde ayrıca sahiplik/takım/yönetici kontrolü uygulanır.

## 4. Kritik API endpoint matrisi

| API grubu | GET / Read | POST / Create | PATCH / Update | DELETE |
|---|---:|---:|---:|---:|
| `/api/customers` | ✓ | ✓ | — | — |
| `/api/customers/[id]` | ✓ | — | ✓ | — |
| `/api/customers/[id]/demands` | kapsamlı müşteri erişimi | ✓ | — | — |
| `/api/listings` | ✓ | ✓ | — | — |
| `/api/listings/[id]` | ✓ | — | ✓ | — |
| `/api/listings/[id]/images` | — | ✓ | ✓ | ✓* |
| `/api/matching` | — | ✓ | — | — |
| `/api/showings` | ✓ | ✓ | — | — |
| `/api/showings/[id]` | — | — | ✓ | — |
| `/api/offers` | ✓ | ✓ | — | — |
| `/api/offers/[id]` | — | — | ✓ | — |
| `/api/sales` | ✓ | ✓ | — | — |
| `/api/sales/[id]` | — | — | ✓ | — |
| `/api/payments` | ✓ | ✓ | — | — |
| `/api/payments/[id]` | — | — | ✓ | — |
| `/api/tasks` | ✓ | ✓ | — | — |
| `/api/tasks/[id]` | — | — | ✓ | — |
| `/api/activities` | ✓ | ✓ | — | — |
| `/api/users` | ✓ | ✓ | — | — |
| `/api/users/[id]` | — | — | ✓ | — |
| `/api/dashboard/finance-summary` | ✓ | — | — | — |
| `/api/prime/brief` | ✓ | — | — | — |
| `/api/prime/action` | — | ✓ | — | — |
| `/api/prime/showing` | — | ✓ | — | — |
| `/api/prime/commercial` | — | ✓ | — | — |

* Fotoğraf silme operasyonel medya içindir. Core business kayıtlarında hard-delete bulunmaz.

## 5. Route-level özel kurallar

### Kullanıcı yönetimi

`/users` ve `/users/[id]` sayfaları manager-only'dir.

API tarafında:

- `SUPER_ADMIN`: tüm yönetilebilir roller.
- `ORG_ADMIN`: `SUPER_ADMIN` atayamaz.
- `OFFICE_ADMIN`: `OFFICE_ADMIN`, `TEAM_LEADER`, `AGENT`, `VIEWER`, `AUDITOR` yönetebilir.
- TEAM_LEADER / AGENT / VIEWER / AUDITOR kullanıcı yönetemez.

Danışman profil/şirket/komisyon güncellemesi yalnızca yetkili manager akışından yapılır.

### Finans

Capability tek başına finans işlemini yetkilendirmez:

- satış scope'u tenant + müşteri ownership ile kontrol edilir;
- tahsilat için satışın broker onayı gerekir;
- tahsilat ve ledger durum değişimleri mevcut finansal iş kurallarına bağlıdır;
- satış onayı manager rolüne özeldir.

### Ticari akış

- Kabul edilmiş teklif satışa dönüşebilir.
- Satışa dönüşmüş teklifin tutar/durum değişiklikleri `409 CONFLICT` ile engellenir.
- Prime ticari akışında da aynı kilit korunur.
- Teklif para birimi portföy para birimi ile uyumlu olmalıdır.

## 6. Sayfa erişim matrisi

| Sayfa | SUPER_ADMIN | ORG_ADMIN | OFFICE_ADMIN | TEAM_LEADER | AGENT | VIEWER | AUDITOR |
|---|---:|---:|---:|---:|---:|---:|---:|
| Genel CRM sayfaları | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/users` | ✓ | ✓ | ✓ | — | — | — | — |
| `/consultant-applications` | ✓ | ✓ | ✓ | — | — | — | — |
| `/platform` | ✓ | — | — | — | — | — | — |

Genel sayfaların gerçek veri erişimi API route'larındaki authorization scope'ları ile belirlenir.

## 7. Enforcement sırası

Kritik route'larda beklenen kontrol sırası:

1. Better Auth session
2. Organization scope
3. Office scope
4. Role capability
5. Ownership / team scope
6. İş kuralı / state transition
7. Audit log

Merkezi yardımcılar:

- `getUserContext()`
- `can()`
- `assertCan()`
- `customerOwnershipScope()`
- `canAssignCustomerOwner()`
- `officeListingScope()`

## 8. Test doğrulaması

Mevcut testler şu davranışları gerçek veya unit seviyesinde doğrular:

- role capability matrix
- agent customer ownership isolation
- team leader team scope
- office/admin customer visibility
- cross-owner assignment denial
- VIEWER write denial
- office listing scope
- public/manager/super-admin page access
- unauthenticated core API contract
- finans ve ticari akışlarda tenant + authorization sınırları

Test kaynakları:

- `web/tests/authz.test.mjs`
- `web/tests/phase6.api.integration.test.ts`
- `web/tests/phase7.critical.e2e.test.ts`

Bu belge, kodla birlikte güncel tutulur. Authorization davranışı değişirse aynı değişiklikte test ve bu doküman da güncellenmelidir.
