-- fix_legal_consents_retention.sql
-- Amaç: Rıza/onay kayıtlarının hesap silmede YOK OLMASINI önlemek.
--
-- Sorun: legal_consents.user_id FK'sı ON DELETE CASCADE idi — kullanıcı
-- hesabını sildiğinde ispat kayıtları da siliniyordu. Bu, Gizlilik
-- Politikası'ndaki "onay kayıtları yasal zamanaşımı süresince saklanır"
-- taahhüdüyle ve KVKK md.5/2-e ("bir hakkın tesisi/korunması için zorunlu
-- işleme") ispat yükümlülüğüyle çelişiyordu.
--
-- Çözüm: FK → ON DELETE SET NULL + kimlik çıpası olarak user_email kolonu.
-- Hesap silinince user_id NULL'a düşer ama satır (e-posta çıpasıyla) kalır.
-- Misafir kayıtları zaten guest_phone çıpasıyla korunuyor.
--
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

-- 1. Kimlik çıpası kolonu
ALTER TABLE legal_consents ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. Mevcut üye kayıtlarına e-posta backfill'i
UPDATE legal_consents lc
SET user_email = u.email
FROM auth.users u
WHERE lc.user_id = u.id AND lc.user_email IS NULL;

-- 3. FK: CASCADE → SET NULL
ALTER TABLE legal_consents DROP CONSTRAINT IF EXISTS legal_consents_user_id_fkey;
ALTER TABLE legal_consents
  ADD CONSTRAINT legal_consents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Not: (user_id, document_key, document_version) unique index'i NULL user_id'leri
-- ayrı saydığı için SET NULL sonrası yetim satırlar çakışma yaratmaz.

-- Doğrulama:
-- SELECT confdeltype FROM pg_constraint WHERE conname = 'legal_consents_user_id_fkey';
-- ('n' dönmeli = SET NULL)
-- SELECT count(*) FROM legal_consents WHERE user_id IS NOT NULL AND user_email IS NULL;
-- (0 dönmeli = backfill tamam)
