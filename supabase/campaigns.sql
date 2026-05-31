-- campaigns table
-- Run this in Supabase SQL Editor, then restart/redeploy the app so
-- the schema cache picks up the new table.

-- Drop old table if it exists with wrong types (no data loss risk — table was never usable)
DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'today_special', 'last_minute')),
  discount_value NUMERIC,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  service_ids   TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX campaigns_shop_id_idx   ON campaigns (shop_id);
CREATE INDEX campaigns_is_active_idx ON campaigns (is_active);
CREATE INDEX campaigns_dates_idx     ON campaigns (start_date, end_date);

-- Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Shop owners can do everything with their own campaigns (all statuses, all dates)
CREATE POLICY "owners_manage_campaigns" ON campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = campaigns.shop_id
        AND shops.owner_id = auth.uid()
    )
  );

-- Customers can only read active campaigns within the valid date range
CREATE POLICY "public_read_active_campaigns" ON campaigns
  FOR SELECT
  USING (
    is_active = true
    AND start_date <= CURRENT_DATE
    AND end_date   >= CURRENT_DATE
  );

-- Auto-update updated_at on every update
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaigns_updated_at();
