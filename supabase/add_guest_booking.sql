-- add_guest_booking.sql
-- Amaç: Hesapsız (misafir) randevu akışı. Misafir randevuları user_id=NULL olur;
-- kimlik guest_name/guest_phone ile tutulur, şifresiz takip/iptal için her randevuya
-- benzersiz guest_token verilir (/randevu/{token} sayfası bu token ile çalışacak).
-- guest_name/guest_phone kolonları add_guest_columns.sql ile eklenmiş olabilir —
-- IF NOT EXISTS sayesinde bu dosyayı tek başına çalıştırmak güvenli.
--
-- INSERT'ler /api/guest-appointments route'u üzerinden service_role ile yapılır;
-- RLS policy değişikliği GEREKMEZ (anon'a doğrudan insert izni bilinçli olarak verilmiyor).
--
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_token UUID UNIQUE DEFAULT gen_random_uuid();

-- user_id NOT NULL ise misafir insert'i patlar; değilse bu satır no-op.
ALTER TABLE appointments ALTER COLUMN user_id DROP NOT NULL;

-- Rate-limit sorgusu (telefon başına aktif randevu sayısı) için index
CREATE INDEX IF NOT EXISTS idx_appointments_guest_phone
  ON appointments (guest_phone)
  WHERE guest_phone IS NOT NULL;

-- Doğrulama (opsiyonel):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'appointments' AND column_name LIKE 'guest%';
