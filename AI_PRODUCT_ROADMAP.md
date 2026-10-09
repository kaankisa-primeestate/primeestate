# PrimeEstate — AI Ürün Prensipleri ve Yol Haritası

**Amaç:** Bu dosya PrimeEstate geliştirmesinin kalıcı ürün pusulasıdır. Yeni özellikler bu kararlara göre tasarlanmalı ve uygulanmalıdır. Bu belge hedefleri ve kuralları tanımlar; yazılan her özelliğin hâlihazırda mevcut olduğunu iddia etmez.

## 1. Vizyon: Yapay zekâ mutfağın aşçısıdır

PrimeEstate yapay zekâsı ayrı bir sohbet robotu değil, programın içine yerleşmiş dijital iş ortağıdır. PrimeEstate onun evidir; yapay zekâ işin hazırlanmasını, eksiklerin kontrolünü, fırsatların bulunmasını ve sonraki adımların önerilmesini mümkün olduğunca üstlenir. Danışman gerekli bilgileri sağlar, insan ilişkisini ve müzakereyi yürütür, kritik kararları verir ve sonucu müşteriye sunar.

**Hedef:** Danışmanın iş yükünü, unutma riskini, tekrar veri girişini ve tıklama sayısını azaltmak; deneyimsiz danışmanların da tutarlı ve kaliteli çalışmasına yardımcı olmak.

## 2. Ana döngü

**Hatırla → Anla → Kontrol et → Öner → Yetki dâhilinde uygula → Sonucu doğrula → Hafızaya al → İyileştir**

**Temel emlak akışı:** Müşteri → Talep → Eşleştirme → Gösterim → Geri bildirim → Teklif → Satış → Komisyon → Tahsilat.

Bütün adımlar birbirine bağlı olmalı. Daha önce bilinen bilgi tekrar sorulmamalı; bir aşamada kaydedilen sonuç sonraki aşamalarda kullanılmalıdır.

## 3. Değiştirilemez ürün prensipleri

1. **Gerçek iş akışı önce gelir.** Her özellik gerçek bir emlak danışmanı ihtiyacını çözmelidir.
2. **Az ekran, az tıklama, az tekrar.** Gereksiz menü, form, alan, modal, bildirim ve rapor eklenmez.
3. **Mobil önceliklidir.** Telefon ve masaüstünde anlaşılır, hızlı ve erişilebilir kullanım hedeflenir.
4. **Tek veri, çok fonksiyon.** Sistemin bildiği bilgi kullanıcıya tekrar girdirilmez.
5. **AI ürünün içinde yaşar.** Yardım müşterinin, portföyün veya yapılan işin bağlamında sunulur.
6. **AI mümkün olan işi üstlenir.** Eksik, belirsiz veya güvenilir biçimde otomatikleştirilemeyen noktada kullanıcıdan yardım ister.
7. **Eksikleri ve fırsatları proaktif bulur.** Eksik müşteri/portföy bilgileri, geciken takipler, uygun eşleşmeler ve unutulan sonraki adımlar tespit edilir.
8. **Öneriler açıklanabilir olmalıdır.** AI gerektiğinde önerinin dayandığı kayıt ve kriterleri belirtir.
9. **Uydurma bilgi yoktur.** Bilinmeyen veri gerçekmiş gibi sunulmaz; belirsizlik açıkça belirtilir.
10. **Yetki ve gizlilik korunur.** Danışman başka danışmanların özel müşteri kayıtlarını AI üzerinden de göremez. Server-side yetkilendirme gevşetilmez.
11. **Finansal hesaplar deterministiktir.** Komisyon, ofis/danışman payı ve tahsilat, onaylanmış sistem kurallarıyla hesaplanır. AI bunları tahmin ederek değiştiremez.
12. **Onay seviyesi nettir.** Öneri sunmak, taslak hazırlamak, mesaj göndermek, fiyat değiştirmek ve finansal kaydı kesinleştirmek farklı aksiyonlardır.
13. **Sonuç doğrulanır.** AI işlem başarılı olmadan tamamlandı diyemez; hata veya bekleyen onay açıkça gösterilir.
14. **Bildirimler anlamlıdır.** Aynı uyarı tekrarlanmaz; işler önem ve zamana göre gruplanır.
15. **Gerçek sonuçlardan öğrenilir.** Öneriler gösterim, teklif, satış ve takip sonuçlarıyla ölçülür.
16. **Gereksiz mimari yoktur.** Önce mevcut kod ve API incelenir; çalışan yapı tekrar yazılmaz.
17. **Her değişiklik test edilir.** Uygun testler ve GitHub CI doğrulanmadan başarı ilan edilmez.

## 4. Yapay zekânın sorumlulukları

### Eksik bilgi ve kalite kontrolü
- Yeni müşteri kaydındaki önemli eksikleri tespit etmek.
- Portföyün pazarlamaya hazır olup olmadığını kontrol etmek.
- İlan türüne göre fotoğraf, açıklama, fiyat, konum, metrekare, oda ve benzeri alanların eksiklerini göstermek.
- Güvenilir kaynakla tamamlanabilecek bilgileri önermek; tahmini bilgiyi doğrulanmış gibi kaydetmemek.

### Proaktif iş takibi
- Geri dönüş bekleyen müşterileri, yaklaşan takip tarihlerini, sonuçlandırılmamış gösterimleri ve takip edilmesi gereken teklifleri belirlemek.
- Tek bir sade günlük öncelikler alanında işleri önem sırasına koymak.
- Tamamlandı, ertele ve ilgisiz seçeneklerini sunmak; aynı uyarıyı sürekli tekrarlamamak.

### Eşleştirme ve fırsatlar
- Yetkili olduğu ofis portföyünü aktif müşteri talepleriyle karşılaştırmak.
- Eşleşmenin neden uygun olduğunu ve hangi kriterlerin eksik/belirsiz kaldığını açıklamak.
- Yeni portföy eklendiğinde uygun müşterileri, yeni talep geldiğinde uygun portföyleri önermek.

### İletişim ve danışmanlık
- Müşteri bağlamına göre WhatsApp/e-posta taslağı, arama özeti ve randevu önerisi hazırlamak.
- Yeterli veri varsa portföy pazarlaması veya fiyat değerlendirmesi önermek; kanıtsız kesin hükümler vermemek.
- Danışmanın bir sonraki en yararlı adımını önermek.

### Sonuçlardan öğrenme
- Gösterim geri bildirimi, ret/kabul gerekçeleri, teklifler ve satış sonuçlarını yetki sınırları içinde kullanmak.
- Tercihleri yalnızca makul kanıt olduğunda güncellemek.
- Eşleştirme ve takip önerilerinin gerçek sonuçlarını ölçmek.

## 5. Aksiyon ve onay politikası

Her AI eylemi şu sınıflardan birine ait olmalıdır:

- **Bilgilendir:** Kayıtları özetle, eksikleri göster.
- **Öner:** Sonraki adımı sun, işlem yapma.
- **Taslak hazırla:** Mesaj, açıklama veya teklif taslağı üret.
- **Onayla ve uygula:** Kullanıcı onayından sonra izin verilen işlemi yap.
- **Otomatik uygula:** Yalnızca önceden yetkilendirilmiş, düşük riskli ve geri alınabilir rutin işler için.
- **İnsan onayı zorunlu:** Dış iletişim, fiyat/teklif taahhüdü, sözleşme, komisyon kuralı veya finansal kaydı kesinleştirme gibi etkisi yüksek işlemlerde geçerli politika ve yetkiye göre onay al.

Her işlem için yetki, veri kapsamı, sonuç kaydı, hata ve tekrar deneme davranışı tanımlanmalıdır.

## 6. Kullanıcı deneyimi standardı

- Her ekranın tek bir ana amacı ve belirgin bir ana aksiyonu olmalı.
- AI yardımı ilgili müşteri/portföy/iş kartında görünmeli.
- Öneriler kısa, anlaşılır ve mümkün olduğunca tek dokunuşla uygulanabilir olmalı.
- Eksik alanlar, AI önerileri ve doğrulanmış bilgiler birbirinden ayrılmalı.
- Kullanıcı öneriyi kabul edebilmeli, düzenleyebilmeli veya erteleyebilmeli.
- Uzun bildirim listeleri yerine önceliklendirilmiş tek iş listesi kullanılmalı.

## 7. Uygulama yol haritası

### Aşama 0 — Mevcut durumu doğrula
`PROJECT_STATE.md` dosyasını ve bu belgeyi oku. GitHub `main`, ilgili kod, açık PR'lar ve CI'ı canlı doğrula. Prime Brief, eşleştirme motoru ve mevcut öğrenme bileşenlerini tekrar kullan; çalışan yetenekleri yeniden geliştirme.

### Aşama 1 — Veri kalitesi ve iş akışı
Müşteri/portföy için gerekli bilgi kontrollerini belirle. Müşteri → talep → eşleşme → gösterim → geri bildirim akışında verinin doğru taşındığını doğrula.

### Aşama 2 — Proaktif günlük iş ortağı
Takip, eksik kayıt ve yeni eşleşmeleri tek bir sade öncelik alanında birleştir. Öncelik, son tarih, erteleme ve uyarı tekrarı kurallarını test et.

### Aşama 3 — Bağlama duyarlı yardım
Müşteri ekranında sonraki adım; portföy ekranında kalite kontrolü ve uygun müşteriler; gösterim sonrasında geri bildirim/teklif desteği; mesaj taslakları ve açıklanabilir öneriler.

### Aşama 4 — Güvenli aksiyon yürütme
AI'nin çağırabileceği API'leri ve rollerini sınırla. Server-side yetki, açık onay, mükerrer işlem koruması, başarı/hata durumu ve denetlenebilir kayıtları test et.

### Aşama 5 — Sonuçlardan öğrenme
Gösterim, geri bildirim, teklif ve satış sonuçlarını ilişkilendir. Tercih çıkarımlarını ve eşleştirme iyileştirmelerini gerçek sonuçlarla değerlendir.

### Aşama 6 — Pilot ve ölçüm
Gerçek danışman senaryolarını uçtan uca ve mobilde test et. Yalnızca ölçülebilir fayda sağlayan özellikleri genişlet.

## 8. Başarı ölçütleri

- Kritik müşteri/portföy eksiklerinin tespit edilme oranı.
- Takiplerin zamanında tamamlanma oranı.
- Eşleşmeden gösterime, gösterimden teklife ve tekliften satışa geçiş sonuçları.
- Danışmanın tıklama, tekrar veri girişi ve görev tamamlama süresi.
- Yanlış veya gereksiz uyarı oranı.
- AI aksiyonlarının başarı/hata oranı ve kullanıcıların önerileri kabul/düzenleme/reddetme oranı.
- Yetki ihlali, yanlış finansal hesaplama veya doğrulanmamış bilginin kesin bilgi gibi sunulması: **kabul edilemez**.

Hedef değerler, başlangıç ölçümü görüldükten sonra belirlenmelidir.

## 9. Güvenlik ve dayanıklılık

- Her istekte kullanıcı, ofis ve kayıt kapsamı sunucu tarafında doğrulanır.
- AI sağlayıcısına yalnızca görev için gerekli asgari veri gönderilir.
- AI çıktısı doğrulanmadan veritabanına yazılmaz; alan ve iş kuralı doğrulamasından geçer.
- Önemli aksiyonlar için denetlenebilir kayıt tutulur.
- AI servisi erişilemezse temel CRM iş akışı çalışmaya devam eder.
- Production veritabanı resetlenmez; mevcut migration ve release-gate kuralları korunur.

## 10. Her özellik için zorunlu kontrol

1. Gerçek danışman hangi işi çözmeye çalışıyor?
2. Mevcut PrimeEstate kodu/API'si kullanılabilir mi?
3. Danışmanın tıklama ve tekrar veri girişi azalıyor mu?
4. Mobilde anlaşılır ve hızlı mı?
5. AI hangi gerçek kayıtlara dayanıyor; belirsizlikleri açık mı?
6. Yetki, ofis sınırı ve gizlilik korunuyor mu?
7. Otomasyon ve onay seviyesi net mi?
8. Finansal ve iş kuralları korunuyor mu?
9. Başarı/hata durumu doğru gösteriliyor mu?
10. Testler ve CI doğrulandı mı?
11. Ölçülebilir fayda var mı?
12. Bu özellik gerçekten gerekli mi?

Kritik sorular cevapsızsa özellik tamamlanmış sayılmaz.

## 11. Her geliştirme oturumunda izlenecek protokol

1. Önce `PROJECT_STATE.md` ve bu belgeyi oku.
2. GitHub `main`, ilgili kod ve CI durumunu canlı doğrula; eski konuşma notlarını güncel durum yerine koyma.
3. Son tamamlanan işi ve sıradaki somut adımı belirle.
4. Prensiplerle çelişen karar varsa sessizce sapma; etkisini açıkla.
5. En küçük anlamlı değişikliği yap ve çalışan bölümlere gereksiz dokunma.
6. Testleri çalıştır; gerçek CI sonucunu doğrula.
7. `PROJECT_STATE.md` devam notunu gerektiğinde güncelle; bu yol haritasını yalnızca kararlar değiştiğinde güncelle.
8. Kullanıcıya ne değiştiğini, commit'i, doğrulanmış kontrolleri ve sıradaki adımı kısa biçimde bildir.
9. Kanıt olmadan “yeşil”, “tamamlandı” veya “production'da çalışıyor” deme.

## 12. Kaçınılacaklar

- Sırf AI var demek için süs sohbet ekranı veya gereksiz özellik eklemek.
- Aynı işi yapan paralel modüller oluşturmak.
- Danışmana aynı veriyi tekrar girdirmek.
- Danışmanı sürekli bildirimle boğmak.
- Gerçek veri olmadan fiyat, müşteri niyeti veya satış ihtimali hakkında kesin hüküm vermek.
- Yetki/onay olmadan müşteriye mesaj, fiyat taahhüdü veya finansal işlem gerçekleştirmek.
- AI'nin finansal formülleri veya ofis kurallarını değiştirmesine izin vermek.
- Test edilmemiş AI çıktısını otomatik olarak gerçek kayda dönüştürmek.

## 13. Karar özeti

**PrimeEstate'in AI'si sohbet kutusu değil, programın içindeki aşçıdır.** Eksikleri bilir, ihtiyaç duyulan bilgileri ister, işi hazırlar, kaliteyi kontrol eder, fırsatları bulur ve sonraki adımı önerir. Danışman gerekli bilgileri sağlar, insan ilişkisini ve müzakereyi yürütür, kritik kararları onaylar ve müşteriye hizmet eder.

Bütün geliştirmelerde hedef: **daha az iş yükü, daha az unutulan adım, daha az tıklama, daha tutarlı danışmanlık ve ölçülebilir iş sonuçları.**
