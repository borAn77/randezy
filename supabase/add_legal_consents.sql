CREATE TABLE IF NOT EXISTS legal_consents (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key      TEXT        NOT NULL,
  document_version  TEXT        NOT NULL DEFAULT '2026-06-01',
  accepted_at       TIMESTAMPTZ DEFAULT now(),
  marketing_consent BOOLEAN     DEFAULT false,
  ip_address        TEXT,
  user_agent        TEXT
);

ALTER TABLE legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
  ON legal_consents FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT sadece API route üzerinden service role ile yapılır.
-- Client tarafı doğrudan bu tabloya yazamaz.
