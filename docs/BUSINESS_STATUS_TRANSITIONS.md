# PrimeEstate — Business Status Transitions

## 1. Listing

Listing durumları:

- AKTIF
- REZERVE
- PASIF
- SATILDI
- KIRALANDI

### Offer accepted → Sale created

`AKTIF → REZERVE`

Kabul edilmiş teklif satışa dönüştüğünde listing rezerve edilir.

### Sale completed

Satılık:

`REZERVE → SATILDI`

Kiralık:

`REZERVE → KIRALANDI`

### Sale cancelled

`REZERVE → AKTIF`

Yalnızca açık satış iptal edildiğinde ve listing hala `REZERVE` durumundaysa uygulanır.

## 2. Sale

Sale durumları:

- ACIK
- TAMAMLANDI
- IPTAL

İzin verilen ana geçişler:

| From | To | Durum |
|---|---|---|
| ACIK | TAMAMLANDI | ✓ |
| ACIK | IPTAL | ✓ |
| TAMAMLANDI | ACIK | — |
| TAMAMLANDI | IPTAL | — |
| IPTAL | ACIK | — |
| IPTAL | TAMAMLANDI | — |

Sale kapanışı ile listing final durumu transaction içinde birlikte güncellenir.

## 3. Offer

Offer durumları:

- TASLAK
- SUNULDU
- KARSILIKLI_TEKLIF
- KABUL
- REDDEDILDI

Sale oluşturmak için:

`Offer.status = KABUL`

olmalıdır.

Aynı accepted offer ikinci bir Sale oluşturmak için kullanılamaz.

## 4. Showing

Showing durumları:

- PLANLANDI
- GERCEKLESTI
- IPTAL

Gösterim müşteri + listing ilişkisi üzerinden yetki kapsamına tabidir.

## 5. Payment

Payment durumları:

- BEKLIYOR
- ODENDI
- IPTAL

`ODENDI` durumundaki tahsilat finansal ledger kayıtlarını doğurur.

Payment oluşturma sırasında:

- sale currency ile payment currency eşleşmelidir;
- toplam tahsilat sale amount'u aşmamalıdır;
- ODENDI ödeme için gerekli commission configuration bulunmalıdır.

## 6. Payment Plan / Installment

PaymentPlan sale başına tektir.

Installment:

- plan içinde sequence ile sıralanır;
- sequence tekrarlanamaz;
- toplam installment tutarı sale amount'una eşit olmalıdır;
- currency sale currency ile aynı olmalıdır.

## 7. Commission immutability

Sale kapanmışsa veya tahsilat gerçekleşmişse:

- commissionRate
- officeShareRate
- grossCommission
- officeShare
- consultantShare

değiştirilmemelidir.

Komisyon:

`grossCommission = amount × commissionRate / 100`

`officeShare = grossCommission × officeShareRate / 100`

`consultantShare = grossCommission - officeShare`

olarak hesaplanır ve 2 ondalığa yuvarlanır.

## 8. Transaction ilkesi

Sale state değişiklikleri ve ilişkili listing state değişiklikleri aynı transaction içinde yapılır.

Finansal ve tenant izolasyonu gerektiren işlemler mümkün olduğunca transaction + server-side authorization ile korunur.

Bu belge değiştiğinde ilgili integration/E2E testleri de güncellenmelidir.
