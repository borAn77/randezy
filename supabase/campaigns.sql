CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'today_special', 'last_minute')),
  discount_value NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  service_ids INTEGER[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Shop owners manage their campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = campaigns.shop_id AND shops.owner_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Public can read active campaigns" ON campaigns
  FOR SELECT USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);
