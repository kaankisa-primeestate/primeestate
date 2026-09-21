# PrimeEstate — CURRENT STATE

> Oturumlar arası devralma kaydıdır. Her yeni oturumda bu dosya GitHub'daki gerçek main/branch/PR/CI durumu ile karşılaştırılır.

## 1. Proje
PrimeEstate, gayrimenkule özel, AI destekli, uçtan uca entegre bir Office Operating System / SaaS platformudur.

**Ana prensip:** TEK VERİ, ÇOK FONKSİYON

- Ana geliştirme repo: `kaankisa-primeestate/primeestate`
- Canlı/referans repo: `kaankisa-primeestate/remax-CRM`
- `remax-CRM` canlı sistemdir; değiştirilmez.
- PrimeEstate ana geliştirme tabanıdır.

## 2. Mimari
- Next.js + React + TypeScript
- Prisma + PostgreSQL/Neon
- Better Auth
- Multi-tenant
- Responsive / mobile-first
- API seviyesinde tenant + role scope
- AI provider bağımsız mimari

## 3. Yetki modeli
- Agent: kendi müşterileri
- Team Leader: kendi ekibinin müşterileri
- Office/Admin: ofis kapsamındaki müşteri verileri
- Ofis portföy havuzu: danışmanlar arasında ortak
- Yetkilendirme frontend'e bırakılmaz; API/backend scope zorunludur.
- AI kullanıcı yetkilerini aşamaz.

## 4. Doğrulanmış main durumu — 21.09.2026
Son main commit:
`a4d7f2ed1f9f495b51b22fe4f5fb3149ca6d2992`

PR #43 (Finance V7) main'e merge edilmiş durumda.

PR #44 — **CRM V8: activate visible workspace and live dashboard**
- Branch: `crm/visible-workspace-v8`
- Son CI: workflow #261
- Son CI sonucu: **success**
- Lint: success
- Typecheck: success
- Production build: success
- PR #44: **merge edildi**
- Merge commit: `a4d7f2ed1f9f495b51b22fe4f5fb3149ca6d2992`

V8 ile:
- Dashboard gerçek CRM API verilerine bağlandı.
- Müşteri / aktif portföy / açık görev / açık fırsat sayıları görünür hale geldi.
- CRM Akış Merkezi görünür hale geldi.
- Müşteri → Talep → Eşleşme → Gösterim → Teklif → Satış → Komisyon → Tahsilat akışı ekrana taşındı.
- CRM Akış Merkezi ve Finans navigasyona eklendi.
- Son aktif portföyler ve son hareketler dashboard'da görünür hale geldi.

## 5. Şu anki aktif iş — CRM V9
Branch:
`crm/dashboard-quick-actions-v9`

PR:
**#45 — CRM V9: add dashboard quick actions and live refresh**

PR #45 durumu: **Açık**
Head commit:
`6107ed33c2403928db506b5f00b052c1602cb24c`

Bu dikey dilimde:
- Dashboard'a görünür Hızlı Aksiyonlar eklendi.
- Yeni Müşteri
- Yeni Portföy
- Eşleştirme
- CRM Akış Merkezi
- Dashboard 30 saniyede bir otomatik yenileniyor.
- Son başarılı güncelleme zamanı gösteriliyor.
- Manuel yenileme korunuyor.
- Mevcut scoped API'ler korunuyor.

**CI durumu:** PR #45 için henüz doğrulanmış workflow sonucu alınmadı. CI yeşil olmadan merge edilmeyecek.

## 6. Sonraki hedef
V9 tamamlandıktan sonra dashboard/CRM operasyon döngüsü doğrulanacak:

1. Yeni müşteri oluştur
2. Dashboard'a yansımasını doğrula
3. Yeni portföy oluştur
4. Dashboard'a yansımasını doğrula
5. Talep oluştur
6. Eşleştirme ekranında görünmesini doğrula
7. Gösterim → Teklif → Satış → Komisyon → Tahsilat zincirini doğrula
8. Yetki kapsamını Agent / Team Leader / Office seviyelerinde doğrula

Amaç: **arka planda çalışan veri değil, kullanıcının ekranda anında görebildiği gerçek operasyon.**

## 7. Kırmızı çizgiler
- Canlı `remax-CRM` değiştirilmez.
- Secret/connection string kullanıcıdan istenmez.
- Tahmin edilen durum gerçek durum gibi sunulmaz.
- Seed veri gerçek veri gibi bırakılmaz.
- Yetkilendirme frontend'e bırakılmaz.
- Modüller bağımsız ada şeklinde tasarlanmaz.
- Çalışan özellikler gereksiz yere kırılmaz.
- CI yeşil olmadan merge edilmez.

## 8. Çalışma disiplini
1. main/branch/PR/CI doğrulanır.
2. Tek bir küçük dikey dilim seçilir.
3. Ayrı branch açılır.
4. Kodlanır.
5. lint + typecheck + build CI'da doğrulanır.
6. PR açılır.
7. CI yeşil olmadan merge edilmez.
8. Merge sonrası main tekrar doğrulanır.
9. CURRENT_STATE.md güncellenir.

## 9. Yeni oturum başlangıç komutu
```
PrimeEstate'i devral. Önce CURRENT_STATE.md dosyasını ve GitHub'daki güncel main, branch, PR ve CI durumunu kontrol et. Bu kayıttaki bilgileri tahmin olarak değil, GitHub'dan doğrulanmış gerçek durumla karşılaştır. Fark varsa belirt. Son tamamlanmamış işten devam et. Canlı remax-CRM reposuna dokunma. Tek bir doğrulanabilir dikey dilim üzerinde çalış; CI yeşil olmadan merge etme. Oturum sonunda CURRENT_STATE.md dosyasını güncelle.
```
