-- add_guest_consents.sql
-- Amaç: Misafir (hesapsız) randevu akışında KVKK aydınlatma + yurt dışı aktarım
-- rızasının legal_consents'e loglanabilmesi. Misafirin user_id'si olmadığı için
-- kimlik çıpası guest_phone (randevudaki normalize telefon). INSERT'ler
-- /api/guest-appointments içinden service_role ile yapılır; RLS değişmez.
--
-- Not: unique index (user_id, document_key, document_version) NULL user_id'leri
-- ayrı sayar (Postgres NULL semantiği) — her misafir randevusu kendi rıza
-- kaydını üretir, bu istenen davranıştır (her işlemde yeniden rıza).
--
-- Supabase dashboard > SQL Editor'da çalıştırılacak.

ALTER TABLE legal_consents
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- KVKK md.11 başvurularında telefonla arama yapabilmek için index
CREATE INDEX IF NOT EXISTS idx_legal_consents_guest_phone
  ON legal_consents (guest_phone)
  WHERE guest_phone IS NOT NULL;

-- Doğrulama (opsiyonel):
-- SELECT column_name FROM information_schema.columns WHERE table_name='legal_consents';
