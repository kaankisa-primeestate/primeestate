# PrimeEstate Decisions

## D001 — PrimeEstate ana geliştirme reposudur

Live `remax-CRM` referans/özellik kaynağıdır. Yeni ürün PrimeEstate repo'sunda geliştirilir.

## D002 — App Router kullanılacak

UI ve Route Handler'lar Next.js App Router üzerinde tutulur.

Backend büyüdükçe API katmanı için ayrı servis ihtiyacı yeniden değerlendirilebilir; bugün sırf teorik ölçekleme için üçüncü bir proje oluşturulmayacaktır.

## D003 — Production build Webpack ile sabitlenmiştir

Next.js 16 production build davranışındaki bundler değişikliklerinin foundation aşamasında belirsizlik yaratmaması için production build açıkça `next build --webpack` kullanır.

Turbopack development için ileride ayrıca değerlendirilebilir.

## D004 — Route manifest build gate

Health/auth route'ları build manifest'inde görünmeden deploy başarılı kabul edilmeyecek.

## D005 — Render standard Next server

Şu an `next start` korunuyor. Custom Node server yalnızca build artefact'larının doğru olduğu kanıtlandıktan sonra runtime routing sorunu ayrıca kanıtlanırsa değerlendirilecek.

## D006 — PostgreSQL pooled connection

Render/Neon için pooled PostgreSQL connection kullanılır.

## D007 — Tenant context server-side

Organization/office/team/role context frontend parametresine güvenilerek belirlenmez. Server-side session + database üzerinden doğrulanır.

## D008 — Production DB migration güvenliği

Production migration yalnızca kontrollü release akışında çalıştırılır. Reset veya rastgele destructive migration yoktur.

## D009 — Authentication ve authorization ayrıdır

Login olması kullanıcının her veriyi görebileceği anlamına gelmez. Her domain operation ayrıca authorization policy'den geçecektir.

## D010 — User/Organization ilişkisi

Şimdilik bir User'ın tek Organization/Office bağlamında olması kabul edilmiştir. Çoklu organization membership ihtiyacı launch öncesi yeniden değerlendirilecektir.
