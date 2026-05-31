-- Hizmet kataloğu için yeni kolonlar
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category      TEXT    DEFAULT 'Diğer',
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS canonical_key TEXT,
  ADD COLUMN IF NOT EXISTS is_custom     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order    INTEGER DEFAULT 999;

-- Eski hizmetler backfill: katalogdan gelmediler, is_custom=true
UPDATE services
SET
  is_custom  = true,
  category   = COALESCE(NULLIF(category, ''), 'Diğer'),
  sort_order = COALESCE(sort_order, 999)
WHERE canonical_key IS NULL;

-- Katalog hizmetlerinde aynı hizmetin iki kez eklenmesini engelle
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_shop_canonical_unique
  ON services (shop_id, canonical_key)
  WHERE canonical_key IS NOT NULL;
