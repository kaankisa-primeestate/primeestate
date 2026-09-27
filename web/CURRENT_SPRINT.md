# 🔒 AKTİF PROJE KİLİDİ — PRIMEESTATE

> **KESİN KURAL — BU DOSYA DEVREDEYKEN PROJE KARIŞTIRILMAYACAKTIR.**
>
> Bu çalışma alanındaki aktif ve tek ana proje **PrimeEstate**'tir.
>
> **Yetkili ana GitHub repository:** `kaankisa-primeestate/primeestate`
>
> **Yetkili ana branch:** `main`
>
> **KESİNLİKLE KARIŞTIRILMAYACAK REPO:** `kaankisa-primeestate/remax-CRM`
>
> `remax-CRM` ayrı bir projedir. Kullanıcı açıkça istemediği sürece bu projeye **bakılmayacak, kontrol edilmeyecek, kod yazılmayacak, durumundan devam edilmeyecek ve referans alınmayacaktır.**
>
> Kullanıcı “PrimeEstate”, “devam edelim”, “kaldığımız yerden devam et”, “GitHub'ı kontrol et”, “durumu kontrol et” veya benzeri bir devam komutu verdiğinde varsayılan ve zorunlu hedef **yalnızca** `kaankisa-primeestate/primeestate` olacaktır.
>
> Her yeni devralmada işlem sırası zorunludur:
> 1. Bu **AKTİF PROJE KİLİDİ** okunur.
> 2. `kaankisa-primeestate/primeestate` repository doğrulanır.
> 3. `main` branch ve güncel commit doğrulanır.
> 4. `CURRENT_STATE.md` varsa, ardından `CURRENT_SPRINT.md` ve ilgili durum/dokümantasyon dosyaları kontrol edilir.
> 5. GitHub Actions / CI durumu kontrol edilir.
> 6. Son tamamlanmamış iş belirlenir.
> 7. Çalışma **yalnızca PrimeEstate üzerinde** sürdürülür.
>
> **Başka bir repository'de bulunan benzer isimli veya eski çalışma, PrimeEstate'in devamı kabul edilemez.**
>
> Bu kilit, kullanıcı açıkça başka bir repository'ye geçiş talimatı vermedikçe geçerlidir.

---

# 🏡 PRIME01

## Current Sprint
**Phase 11 · API Contract Hardening / Workflow Reliability**

## Durum
✅ Core finance chain remains live and verified. Mobile-first polish is complete through Dashboard, Portfolio, Customer, Customer 360, Customer Edit, Sales Ops / İş Akışı, Finance, Calendar and Calls. Critical onboarding/user-admin API error contracts have now been standardized and verified.

## Mevcut Ana
`c2914b1fd88778f0c1c7790f25060346335b6a66`

## Son Doğrulama
- API contract + mobile regression → Web Quality #1096 ✅
- Production auth/runtime smoke → Production Auth Smoke #180 ✅

## Tamamlananlar
- Danışman başvuru → broker onayı → kalıcı danışman profil/şirket/komisyon planı
- Teklif → satış dönüşümü
- Satışta ofis komisyon kaynağı ve tarihsel source snapshot
- Yetkili kullanıcı için manuel komisyon override
- Broker approval akışı
- Onay öncesi ödeme ve ödeme planı oluşturma engeli
- Ödeme planı / taksit / tahsilat bağlantısı
- Finance kritik iş kuralları için gerçek HTTP/E2E kontrolleri

## Değişmez İş Kuralları
- İşlem anında danışmanın ofis kaydı komisyon paylaşımının varsayılan kaynağıdır.
- Manuel override gerektiğinde mevcut işlem değerleri değişebilir; tarihsel source snapshot korunur.
- Broker onayı olmadan ödeme veya ödeme planı oluşturulamaz.
- Danışman müşteri kayıtları kendi yetki kapsamı dışına taşmaz.
- Ofis ortak portföyü ofis kapsamındaki danışmanlarca görünür.

## Sıradaki İş
Core CRM API'lerinin unauthenticated error contract kapsamı tamamlandı. Şimdi tenant/workflow sınırlarını koruyan yetkili 403 ve validation kontratlarını gerçek HTTP testleriyle genişleteceğiz.

## Sonraki Fazlar
- Remaining CRM API error contract hardening
- Dashboard refresh UX
- Deletion policy
- Auth matrix documentation refinements
- Stale branch / obsolete PR cleanup

## Kurallar
- Do not merge red.
- Production DB reset yok.
- Schema değişikliği olmadıkça migration yok.
- Secret/connection string source'a girmez.
- Server-side authorization zayıflatılmaz.
- Tanımlanmamış REP / MAKSİMUM hesabı icat edilmez.
- `kaankisa-primeestate/remax-CRM` PrimeEstate devamı değildir ve kullanıcı açıkça istemedikçe kullanılmaz.
