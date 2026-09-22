# PrimeEstate — Release & Migration Procedure

> Uygulama değişiklikleri için kontrollü release ve Prisma migration akışı.

## 1. Release ilkeleri

- Geliştirme yalnızca `kaankisa-primeestate/primeestate` üzerinde yapılır.
- `kaankisa-primeestate/remax-CRM` değiştirilmez.
- Production database reset edilmez.
- Secret, connection string ve kullanıcı parolaları source code'a yazılmaz.
- CI yeşil olmadan merge yapılmaz.
- Production migration yalnızca kontrollü release adımında uygulanır.
- Render'ın "Live" durumu tek başına release doğrulaması değildir.

## 2. Branch → PR akışı

1. Güncel `main` doğrulanır.
2. Ayrı bir feature/fix branch'i açılır.
3. Değişiklik yapılır.
4. İlgili testler eklenir veya güncellenir.
5. PR açılır.
6. En az Web Quality ve ilgili Critical Tests kontrolleri yeşil olmalıdır.
7. Merge sonrası `main` commit'i tekrar doğrulanır.

## 3. Web Quality kapısı

`PrimeEstate Web Quality` aşağıdaki sırayı çalıştırır:

1. `npm ci`
2. Prisma shadow database oluşturma
3. migration parity
4. `npm test`
5. lint
6. typecheck
7. production build

Bu zincirden biri başarısızsa release kabul edilmez.

## 4. Critical Tests

`PrimeEstate Critical Tests` gerçek kritik test suite'ini ayrı bir CI kapısı olarak çalıştırır.

Özellikle:
- authorization isolation
- gerçek API route integration
- Payment/Ledger invariantleri
- PaymentPlan/Installment invariantleri
- Phase 7 kritik E2E zinciri

kontrol edilir.

## 5. Production deploy doğrulaması

`main` üzerindeki `web/**` değişikliklerinde Production Auth Smoke workflow'u çalışır.

Sıra:

1. yeni commit'in Render'a deploy edilmesini bekler;
2. `GET /api/deployment-check` üzerinden Render branch/commit bilgisini kontrol eder;
3. beklenen commit gerçekten canlı değilse auth smoke çalıştırmaz;
4. canlı commit eşleşirse login, session, customer, sales, payments ve payment-plan endpoint'lerini smoke test eder.

Bilinen production URL:

`https://primeestate-v9eo.onrender.com`

## 6. Prisma migration prosedürü

### Staging

Önce staging migration workflow'u ile:

`npx prisma migrate deploy`

çalıştırılır.

Migration schema parity ve uygulama testlerinden sonra production düşünülür.

### Production

Production migration otomatik bir feature merge adımı değildir.

Kontrollü release sırasında:

`npx prisma migrate deploy`

`PRIMEESTATE_PRODUCTION_DATABASE_URL` secret'ı ile çalıştırılır.

Production migration öncesi:

- migration sırası incelenir;
- destructive değişiklik olup olmadığı kontrol edilir;
- mevcut production durumu doğrulanır;
- gerekiyorsa yedek/geri dönüş planı hazırlanır.

Migration sonrası `Check Prisma Production Migration Status` ile:

`npx prisma migrate status`

çalıştırılarak production migration durumu doğrulanır.

## 7. Rollback ilkesi

Prisma migration'ları için geriye dönüş, production database'i resetlemek anlamına gelmez.

Bir migration hatası durumunda:

1. uygulama release'i durdurulur;
2. hata ve migration adı izole edilir;
3. gerekiyorsa ileri yönlü düzeltme migration'ı hazırlanır;
4. production database reset kullanılmaz;
5. source code ile database migration state yeniden eşleştirilir.

## 8. Release sonrası doğrulama

Final main commit için:

- Web Quality ✅
- Critical Tests ✅
- Production Auth Smoke ✅
- migration status ✅ (migration değiştiyse)
- `/api/health` runtime kontrolü
- Dashboard finans endpoint'leri
- Finance endpoint'leri
- authorization davranışı

doğrulanır.

Release ancak source → build → deploy → database → auth → authorization zinciri tutarlı olduğunda tamamlanmış kabul edilir.
