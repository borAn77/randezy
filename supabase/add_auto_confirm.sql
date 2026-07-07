-- Otomatik Onay: işletme sahibi profil ekranından açarsa, yeni gelen
-- randevular "Beklemede" yerine doğrudan "Onaylandı" olarak oluşturulur.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS auto_confirm_appointments BOOLEAN DEFAULT false;
