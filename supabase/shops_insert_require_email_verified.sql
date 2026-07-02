-- shops_insert_require_email_verified.sql
-- Amaç: Doğrulanmamış (profiles.email_verified=false) bir session sahibinin, frontend
-- kapısını (isletme-ekle, pro) atlayıp doğrudan Supabase client'tan shops INSERT çağırarak
-- işletme oluşturmasını DB seviyesinde engelle. Şu ana kadar sadece owner_id kontrol
-- ediliyordu, email_verified hiç kontrol edilmiyordu (bkz. auth_email_verified_gap notu).
--
-- ÖNCE supabase/backfill_email_verified.sql çalıştırılmış ve onaylanmış OLMALI.
-- Aksi halde OTP sisteminden önce kayıt olmuş, hâlâ email_verified=false olan mevcut
-- işletme sahipleri bu policy ile anında shop ekleyemez hale gelir.
--
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

DROP POLICY IF EXISTS "shops_owner_insert" ON shops;

CREATE POLICY "shops_owner_insert" ON shops FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email_verified = true
    )
  );

-- Doğrulama (opsiyonel, çalıştırdıktan sonra):
-- SELECT policyname, with_check FROM pg_policies WHERE tablename = 'shops' AND policyname = 'shops_owner_insert';
