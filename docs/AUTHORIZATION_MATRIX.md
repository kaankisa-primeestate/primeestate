# PrimeEstate — Authorization Matrix

## 1. Roller

- SUPER_ADMIN
- ORG_ADMIN
- OFFICE_ADMIN
- TEAM_LEADER
- AGENT
- VIEWER
- AUDITOR

## 2. Capability matrix

| Rol | Read | Create | Update | Delete | Manage |
|---|---:|---:|---:|---:|---:|
| SUPER_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| ORG_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| OFFICE_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| TEAM_LEADER | ✓ | ✓ | ✓ | — | — |
| AGENT | ✓ | ✓ | ✓ | — | — |
| VIEWER | ✓ | — | — | — | — |
| AUDITOR | ✓ | — | — | — | — |

Merkezi policy dosyası: `web/src/lib/authz.ts`

## 3. Veri kapsamı

### Manager rolleri

SUPER_ADMIN, ORG_ADMIN ve OFFICE_ADMIN:

- kendi organization + office kapsamındaki kayıtları görür;
- yetkileri kapsamındaki create/update/delete/manage işlemlerini yapabilir.

### TEAM_LEADER

- team kapsamındaki müşteri kayıtlarını görür;
- create/update yapabilir;
- kullanıcıların özel müşteri kayıtlarını başka team'e açamaz.

### AGENT

- yalnızca kendi `ownerUserId` müşterilerini görür;
- kendi müşterilerine ait demand/activity/task/offer/sale zincirini işlem alanı içinde kullanır;
- başka danışmanın özel müşteri kaydını göremez;
- ortak ofis portföyünü görebilir.

### VIEWER / AUDITOR

- read-only'dir;
- write endpoint'lerinde backend tarafından reddedilir.

## 4. Kaynak bazlı görünürlük

| Kaynak | Agent | Team Leader | Manager |
|---|---|---|---|
| Customers | Kendi müşterileri | Team müşterileri | Office/org kapsamı |
| Demands | Kendi müşteri kapsamı | Team müşteri kapsamı | Office/org kapsamı |
| Listings | Ortak office portfolio | Ortak office portfolio | Office/org kapsamı |
| Showings | İlgili müşteri/listing yetkisi | Team kapsamı | Office/org kapsamı |
| Offers | İlgili müşteri/listing yetkisi | Team kapsamı | Office/org kapsamı |
| Sales | İlgili müşteri/listing yetkisi | Team kapsamı | Office/org kapsamı |
| Payments | Yetkili sale kapsamı | Team kapsamı | Office/org kapsamı |
| Payment Plans | Yetkili sale kapsamı | Team kapsamı | Office/org kapsamı |
| Installments | Yetkili plan kapsamı | Team kapsamı | Office/org kapsamı |
| Users | — | — | Manager |

## 5. Enforcement ilkeleri

Authorization yalnızca UI'daki menü gizleme davranışına bırakılmaz.

Her kritik API route:

1. Better Auth session
2. organization scope
3. office scope
4. role capability
5. ownership/team scope
6. ilişki üzerinden erişim

kontrolünü server-side uygular.

Merkezi yardımcılar:

- `getUserContext()`
- `can()`
- `assertCan()`
- `customerOwnershipScope()`
- `canAssignCustomerOwner()`
- `officeListingScope()`

## 6. Test karşılığı

Authorization davranışı şu test sınıflarıyla doğrulanır:

- role capability matrix
- agent customer ownership isolation
- cross-office isolation
- cross-organization isolation
- shared office listing visibility
- Team Leader team scope
- Office/Admin visibility
- cross-owner assignment denial
- VIEWER write denial
- Better Auth login/session üzerinden gerçek HTTP route erişimi

Bu belge policy'nin referansıdır; kod davranışı değiştiğinde belge ve testler birlikte güncellenmelidir.
