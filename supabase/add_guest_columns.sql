-- Manuel (işletme tarafından oluşturulan) randevular için misafir müşteri bilgisi
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;
