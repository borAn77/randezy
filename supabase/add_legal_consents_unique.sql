-- Aynı kullanıcı aynı belgeyi aynı versiyonla tekrar yazamasın
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_consents_user_doc_ver
  ON legal_consents (user_id, document_key, document_version);
