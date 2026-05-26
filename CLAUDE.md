# Randezy — Claude Notları

Bu dosyayı her yeni oturumda oku. Mehmet'in onayladığı bekleyen işler burada.

---

## Bekleyen Web Dashboard Görevleri

### 1. Finans label düzeltmesi — KÜÇÜK
`frontend/app/dashboard/page.tsx` içinde "BUGÜN ONAYLANAN RANDEVULAR" yazan label yanıltıcı.
Müşteri "bugün onayladığım randevular" sanıyor ama aslında "bugün tarihli onaylı/tamamlanmış randevular" demek.
**Yapılacak:** Sadece label metnini düzelt. Hesaplama mantığına dokunma.

### 2. Web/Mobile ciro tutarsızlığı — ORTA
Web dashboard ciro = `Onaylandı + Tamamlandı`
Mobile FinanceScreen ciro = sadece `Tamamlandı`
Aynı işletme sahibi iki platformda farklı rakam görüyor.
**Yapılacak:** Web'i `Tamamlandı` only'ye çek + `Onaylandı` için ayrı "Beklenen Gelir" kartı ekle.
Dosyalar: `frontend/app/dashboard/page.tsx` satır 583, `mobile/screens/FinanceScreen.tsx` satır 64

### 3. Gelmedi (No-Show) metriği — ORTA
`Gelmedi` status var (dashboard'da buton var) ama hiçbir metriğe girmiyor.
Ne ciro'ya sayılıyor, ne iptal kaybına. Tamamen görünmez.
**Yapılacak:** Gelmedi randevuları ayrı bir metrik olarak göster (sayı + toplam tutar).
Dosya: `frontend/app/dashboard/page.tsx` — `cancelledAll` filtresine ek olarak `noShowAll` filtresi ekle.

---

## Tamamlanan Güvenlik İşleri (Dokunma)

- `/api/notify` — auth + appointmentId zorunlu, DB-source ✅
- `/api/cron/reminders` — CRON_SECRET zorunlu ✅
- Storage bucket — sadece INSERT ✅
- RLS tüm tablolarda aktif ✅
- `campaigns.sql` INTEGER düzeltildi ✅

---

## Kalıcı Kurallar (Her Zaman Geçerli)

- Tüm UI Türkçe — hiçbir buton, label, menü İngilizce olamaz
- Push protokolü: `git pull boran main --no-rebase && git push boran main && git push origin main`
- UI redesign yapma — sadece logic/bug fix
- `alert()` kullanma — `setToast` veya `showToast` kullan
- Kampanya/fiyat logic'ine dokunma (`calcDiscountedPrice`, `appointment.price`)
- Büyük refactor yapma — sadece minimal değişiklik
