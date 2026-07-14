-- Hizmet başına örnek çalışma fotoğrafları
-- Dashboard > Hizmetler > "Fotoğraf Ekle" ile yüklenir,
-- müşteri randevu ekranında (shop sayfası hizmet satırı) küçük önizleme olarak gösterilir.
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS example_photos TEXT[] DEFAULT '{}';
