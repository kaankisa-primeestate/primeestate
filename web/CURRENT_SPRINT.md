# 🏡 PRIME01

## Sprint
Foundation V1 · Authentication + Tenant Context

## Durum
🟡 Auth foundation hazırlanıyor · staging database hazır

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
- [x] Staging PostgreSQL provision edildi
- [x] İlk Prisma migration staging'e uygulandı ve doğrulandı
- [x] GitHub Actions staging migration workflow başarıyla çalıştı
- [x] Better Auth entegrasyonunun ilk veri modeli ve API route'u hazırlandı
- [x] Domain User ↔ AuthUser bağlantısı için ayrı kimlik katmanı tanımlandı

## Bu Aşamanın Amacı

Ekranları gerçek PostgreSQL verisine bağlamak ve güvenli tenant/rol kapsamını oluşturmak.

**Temel akış:**

> Giriş → Auth Session → Domain User → Organization / Office → Yetki → Müşteri API → Gerçek Müşteri Ekranı

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Mevcut Durum

Staging PostgreSQL hazır ve ilk migration uygulanmış durumda.

Bu branch üzerinde:

- Better Auth bağımlılığı eklendi.
- AuthUser / AuthSession / AuthAccount / AuthVerification modelleri eklendi.
- Domain User ile AuthUser arasında güvenli bağlantı alanı eklendi.
- Better Auth API route'u eklendi.
- Login / ilk ofis oluşturma ekranının ilk V1'i eklendi.
- Auth migration SQL'i hazırlandı.
- BETTER_AUTH_SECRET ve BETTER_AUTH_URL için environment dokümantasyonu eklendi.

**Henüz tamamlanmayanlar:**

- Auth migration'ın staging'e uygulanması
- Render'da Better Auth environment değişkenlerinin tanımlanması
- Login/signup uçtan uca testi
- Session'dan domain User + tenant context çıkarılması
- Backend authorization / tenant scope
- Gerçek Customer API
- Seed customer verisinin kaldırılması
- Müşteriler ekranının gerçek PostgreSQL'e bağlanması

## Sonraki Adım

Önce bu auth foundation branch'i build/type/schema açısından doğrulanacak.

Ardından migration staging'e uygulanacak ve gerçek login/signup akışı test edilecek.

Auth ve tenant scope doğrulanmadan müşteri API'sine geçilmeyecek.

**Production veritabanına reset veya rastgele migration çalıştırılmayacaktır.**

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
