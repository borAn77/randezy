-- cleanup_profile_business_names.sql
-- Amaç: profiles.full_name içine yanlışlıkla işletme adı yazılmış kullanıcıları temizle.
-- ÇALIŞTIRMADAN ÖNCE MUTLAKA ONAY AL.
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

-- 1. Önce kimlerin etkilendiğini GÖR (sadece SELECT, veri değiştirmez):
SELECT
  p.id,
  p.full_name AS kirli_full_name,
  s.name AS shop_name,
  u.raw_user_meta_data->>'full_name' AS google_full_name,
  u.raw_user_meta_data->>'name' AS google_name
FROM profiles p
JOIN shops s ON s.owner_id = p.id
JOIN auth.users u ON u.id = p.id
WHERE LOWER(p.full_name) = LOWER(s.name)
  AND p.full_name IS NOT NULL;

-- 2. Temizleme — Google/OAuth metadata varsa onu kullan, yoksa NULL bırak:
-- (ONAY SONRASI çalıştır)
/*
UPDATE profiles p
SET full_name = COALESCE(
  NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
  NULL
)
FROM shops s
JOIN auth.users u ON u.id = p.id
WHERE s.owner_id = p.id
  AND LOWER(p.full_name) = LOWER(s.name)
  AND p.full_name IS NOT NULL;
*/

-- Sonuç: full_name temizlenen kullanıcılar /hesabim'de profil tamamlama akışına düşer.
