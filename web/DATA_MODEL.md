# PrimeEstate PostgreSQL Data Model — Foundation V1

## Amaç

PrimeEstate ekranlarını tek veri modeline bağlayacak PostgreSQL temel şeması.

Temel ilke: **TEK VERİ, ÇOK FONKSİYON.**

## Tenant hiyerarşisi

Organization → Office → Team → User

Her müşteri, portföy, taşınmaz ve operasyon kaydı tenant kapsamını taşıyacak şekilde tasarlanmıştır.

## Ana domain ilişkileri

Organization
→ Offices / Users / Customers / Properties / Listings

Customer
→ CustomerRole[] / Demand[] / Activity[] / Task[] / Showing[] / Offer[]

Demand
→ Match[]

Property
→ Listing[] / Match[]

Listing
→ Match[] / Activity[] / Showing[] / Offer[]

Bu sayede:

**Müşteri → Talep → Eşleşme → Portföy → Aktivite → Görev → Gösterim → Teklif**

aynı veri zincirinde ilerler.

## Yetki için temel alanlar

- Organization scope
- Office scope
- Team scope
- User ownership
- Ortak ofis portföyü

Agent izolasyonu daha sonra yalnızca UI ile değil API/database katmanında enforce edilecektir.

## Neden Property ve Listing ayrı?

Taşınmaz fiziksel varlıktır.

Listing ise o taşınmazın belirli bir satış/kiralama kaydıdır.

Bu ayrım gelecekte aynı taşınmazın yeniden satışa çıkması, farklı ilan kanalları, ilan geçmişi ve işlem geçmişinin doğru tutulması için korunmuştur.

## Dinamik alanlara hazırlık

Kategoriye özel alanlar için çekirdek modelleri bozmadan ilerlemek üzere sonraki aşamada metadata/field-definition katmanı eklenecektir.

Örnek:

- Daire → oda, banyo, balkon
- Arsa → m², imar, emsal
- İş yeri → kullanım tipi, cephe
- Villa → bahçe, havuz vb.

## Migration

Bu aşamada canlı veritabanı bağlantısı olmadığı için production migration çalıştırılmamıştır.

Bir sonraki foundation adımında PostgreSQL bağlantısı sağlandığında migration oluşturulup staging veritabanında uygulanacaktır.

**Production veritabanına rastgele/reset migration çalıştırılmayacaktır.**
