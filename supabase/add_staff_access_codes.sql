-- add_staff_access_codes.sql
-- Amaç: Personel giriş kodu sistemi (Faz 2 — owner kod yönetimi).
--
-- NEDEN AYRI TABLO? (plandan bilinçli sapma)
-- İlk plan kodu staff tablosuna kolon olarak eklemekti. Ancak staff tablosunda
-- "staff_public_read USING (true)" politikası var — müşterilerin booking'de
-- personel seçebilmesi için HERKES (anon dahil) staff'ı okuyabiliyor ve shop
-- sayfası select('*') kullanıyor. access_code oraya konursa anon key ile tüm
-- kodlar sızar (Postgres RLS kolon bazlı filtreleme yapamaz; kolon-privilege
-- REVOKE ise select('*') çağrılarını patlatır). Çözüm: kodlar OWNER-ONLY RLS'li
-- ayrı tabloda. Mevcut staff politikaları ve sorguları hiç değişmiyor;
-- kodu olmayan personel = satırı olmayan personel (null patlaması imkânsız).
--
-- Erişim modeli:
--   - İşletme sahibi: kendi personelinin kodunu okur/yazar (aşağıdaki policy)
--   - Personel girişi (Faz 3): /api/staff endpoint'leri service_role ile doğrular
--   - Anon: HİÇBİR erişim yok
--
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

CREATE TABLE IF NOT EXISTS staff_access_codes (
  staff_id   UUID PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  code       TEXT UNIQUE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_access_codes ENABLE ROW LEVEL SECURITY;

-- Sadece işletme sahibi kendi personelinin kodlarını yönetebilir
CREATE POLICY "staff_codes_owner_all" ON staff_access_codes FOR ALL
  USING (
    staff_id IN (
      SELECT s.id FROM staff s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE sh.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT s.id FROM staff s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE sh.owner_id = auth.uid()
    )
  );

-- Faz 3'te kod doğrulama sorgusu (service_role) için index zaten UNIQUE ile geliyor.

-- Doğrulama (opsiyonel):
-- SELECT policyname FROM pg_policies WHERE tablename = 'staff_access_codes';
