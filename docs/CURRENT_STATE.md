# PrimeEstate Current State

## Foundation V1

**Aşama:** PostgreSQL + Authentication + Production Build Hardening

### Çalışan/kurulu parçalar

- Next.js App Router
- PostgreSQL + Prisma 7
- Better Auth + Prisma adapter
- Organization → Office → Team → User hiyerarşisi
- Customer / Demand / Property / Listing / Match temel modeli
- Activity / Task / Showing / Offer temel modeli
- tenant-aware user context
- staging migration workflow
- Render Web Service

### Foundation güvenlik durumu

Authentication foundation hazır.

Authorization enforcement henüz tamamlanmadı.

Agent isolation backend query katmanında sonraki kritik iş kalemidir.

### Production build

- Webpack production build
- temiz `.next` build
- build-time route manifest verification
- lint
- typecheck
- dependency lock synchronization

## Bir sonraki teknik sıra

1. Production route serving doğrulaması
2. İlk Office/Admin bootstrap
3. Login/logout/session
4. Authorization policy layer
5. Customer persistence
6. Demand persistence
7. Property/Listing persistence
8. Matching persistence
9. Activity/Task/Showing/Offer persistence
10. Cross-module transaction flow
11. Tests + tenant isolation tests

## Kırmızı çizgiler

- live CRM repo'ya dokunulmayacak
- production DB reset edilmeyecek
- frontend-only authorization yapılmayacak
- aynı veri ikinci kez tutulmayacak
- AI critical fields'e sessizce yazmayacak
- lisans incelemesi olmadan open-source kod kopyalanmayacak
