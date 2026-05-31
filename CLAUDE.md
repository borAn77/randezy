# Randezy — Claude Kalıcı Kurallar

Bu kurallar her oturumda geçerlidir. Değiştirme.

## Kalıcı Kurallar

- Tüm UI Türkçe — hiçbir buton, label, menü İngilizce olamaz
- Push protokolü: `git pull boran main --no-rebase && git push boran main && git push origin main`
- UI redesign yapma — sadece logic/bug fix
- `alert()` kullanma — `setToast` veya `showToast` kullan
- Kampanya/fiyat logic'ine dokunma (`calcDiscountedPrice`, `appointment.price`)
- Büyük refactor yapma — sadece minimal değişiklik

## Tamamlanan Güvenlik İşleri (Dokunma)

- `/api/notify` — auth + appointmentId zorunlu, DB-source ✅
- `/api/cron/reminders` — CRON_SECRET zorunlu ✅
- Storage bucket — sadece INSERT ✅
- RLS tüm tablolarda aktif ✅
