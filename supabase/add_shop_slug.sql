-- Randezy: shops.slug — profesyonel paylaşılabilir link (/b/<slug>)
-- Supabase SQL Editor'da çalıştır. /shop/[id] aynen çalışmaya devam eder; slug ek katmandır.

-- 1) Kolon
ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2) Türkçe-güvenli slugify yardımcı fonksiyonu
CREATE OR REPLACE FUNCTION randezy_slugify(txt TEXT) RETURNS TEXT AS $$
  SELECT trim(BOTH '-' FROM
    regexp_replace(
      regexp_replace(
        lower(translate(coalesce(txt, ''),
          'ğüşıöçĞÜŞİÖÇ',
          'gusiocgusioc')),
        '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g')
  );
$$ LANGUAGE sql IMMUTABLE;

-- 3) Mevcut işletmeler için backfill (çakışmada -2, -3 ...)
DO $$
DECLARE r RECORD; base TEXT; cand TEXT; n INT;
BEGIN
  FOR r IN SELECT id, name FROM shops WHERE slug IS NULL OR slug = '' ORDER BY id LOOP
    base := randezy_slugify(r.name);
    IF base = '' THEN base := 'isletme'; END IF;
    cand := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM shops WHERE slug = cand AND id <> r.id) LOOP
      n := n + 1; cand := base || '-' || n;
    END LOOP;
    UPDATE shops SET slug = cand WHERE id = r.id;
  END LOOP;
END $$;

-- 4) Benzersizlik
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug_unique ON shops (slug) WHERE slug IS NOT NULL;

-- 5) Yeni işletmelerde slug'ı otomatik üret (isim değişse bile slug DEĞİŞMEZ — sadece boşken üretilir)
CREATE OR REPLACE FUNCTION shops_set_slug() RETURNS TRIGGER AS $$
DECLARE base TEXT; cand TEXT; n INT := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := randezy_slugify(NEW.name);
    IF base = '' THEN base := 'isletme'; END IF;
    cand := base;
    WHILE EXISTS (SELECT 1 FROM shops WHERE slug = cand AND id IS DISTINCT FROM NEW.id) LOOP
      n := n + 1; cand := base || '-' || n;
    END LOOP;
    NEW.slug := cand;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shops_set_slug ON shops;
CREATE TRIGGER trg_shops_set_slug BEFORE INSERT ON shops
  FOR EACH ROW EXECUTE FUNCTION shops_set_slug();
