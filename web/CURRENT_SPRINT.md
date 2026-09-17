# 🏡 PRIME01

## Sprint
Customer & Demand Workspace V1

## Durum
🚧 Development

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
- [x] Customer domain types (`Customer`, `CustomerRole`, `Demand`)
- [x] Customer + Demand seed data
- [x] Customer list, search and role filtering
- [x] Customer 360-style summary
- [x] Multiple roles per customer
- [x] Multiple demand profiles per customer
- [x] Demand detail cards and next-action context
- [x] Prime insight V1 preview panel

## Bu Aşamanın Amacı

Müşteriyi tekil bir kayıt olarak ele almak ve aynı müşteri altında birden fazla rol ile birden fazla talep profilini destekleyen temel çalışma alanını oluşturmak.

**Temel ilke:** TEK VERİ, ÇOK FONKSİYON.

## Sonraki Adım

Portföy veri modeli ve Portföy Workspace V1. Buradaki talep yapısı, sonraki eşleştirme motorunun temel girdisi olacak.

## Teknik Not

Bu sprintte ekran ve tipli domain/seed katmanı hazırlandı. Gerçek persistence, auth/RBAC ve API bağlantısı sonraki foundation aşamalarında eklenecek; V1 ekranı bunu varmış gibi göstermiyor.

## Kural

**Finished > Perfect**

Her aşama bir sonraki modülün veri modeline bağlanabilecek şekilde tamamlanır; kritik mimari kararlar dokümante edilmeden sonraki katmana geçilmez.
