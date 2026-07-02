-- backfill_email_verified.sql
-- Amaç: Custom OTP e-posta doğrulama sistemi 3805c8a commit'iyle 2026-06-03 12:59 (+02) tarihinde
-- devreye girdi. Bu tarihten ÖNCE kayıt olmuş kullanıcılar hiçbir zaman OTP akışından geçmedi,
-- bu yüzden profiles.email_verified=false/NULL kaldı. /isletme-ekle, /pro ve (yakında) hesabim,
-- randevularim sayfalarına eklenen email_verified kapısı bu kullanıcıları OTP ekranına hapseder.
-- Bu script SADECE bu geriye dönük durumu düzeltir — OTP sisteminden SONRA (2026-06-03'ten
-- itibaren) kayıt olan ve hâlâ doğrulanmamış kullanıcılara DOKUNMAZ (onların doğrulanması doğru).
--
-- ÇALIŞTIRMADAN ÖNCE MUTLAKA ÖNİZLEME + SAYIM SONUCUNU İNCELEYİP ONAY AL.
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

-- Not: "confirm email" ayarı KAPALI olduğu için auth.users.email_confirmed_at, gerçek bir
-- doğrulamayı değil, sadece kaydın tamamlandığını gösterir (bkz. supabase_confirm_email notu).
-- Yine de yarım kalmış/anormal kayıtları backfill dışında tutmak için ek bir güvenlik filtresi
-- olarak kullanılıyor.

-- 1. ÖNİZLEME — etkilenecek satırları göster (sadece SELECT, veri değiştirmez):
SELECT
  p.id,
  p.email,
  p.email_verified AS mevcut_email_verified,
  u.created_at AS kayit_tarihi,
  u.email_confirmed_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.created_at < '2026-06-03 00:00:00+00'
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified IS NOT TRUE
ORDER BY u.created_at;

-- 2. SAYIM — kaç satır etkilenecek:
SELECT count(*) AS etkilenecek_satir
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.created_at < '2026-06-03 00:00:00+00'
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified IS NOT TRUE;

-- 3. UYGULA — SADECE yukarıdaki önizleme onaylandıktan sonra yorumdan çıkarıp çalıştır:
/*
UPDATE profiles p
SET email_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND u.created_at < '2026-06-03 00:00:00+00'
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified IS NOT TRUE;
*/

-- Sonuç: OTP sisteminden önce kayıt olmuş mevcut kullanıcılar, yeni email_verified
-- kapılarında (isletme-ekle, pro, hesabim, randevularim) OTP'ye takılmadan geçer.
