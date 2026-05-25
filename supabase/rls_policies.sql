-- ══════════════════════════════════════════════════════════════════════════════
-- Randezy RLS Policies + Score Trigger + Slot RPC
-- Deploy tarihi: 2026-05-25
-- Type audit: shops.id=INTEGER, appointments.shop_id=INTEGER, reviews.shop_id=INTEGER
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- SHOPS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shops_public_read"  ON shops FOR SELECT USING (true);
CREATE POLICY "shops_owner_insert" ON shops FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_owner_update" ON shops FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_owner_delete" ON shops FOR DELETE USING (owner_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_public_read" ON services FOR SELECT USING (true);
CREATE POLICY "services_owner_write" ON services FOR ALL
  USING     (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK(shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- STAFF
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_public_read"  ON staff FOR SELECT USING (true);
CREATE POLICY "staff_owner_write"  ON staff FOR ALL
  USING     (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK(shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- SHOP_HOURS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE shop_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_hours_public_read" ON shop_hours FOR SELECT USING (true);
CREATE POLICY "shop_hours_owner_write" ON shop_hours FOR ALL
  USING     (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK(shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read"     ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_customer_insert" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_author_update"   ON reviews FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_owner_reply"     ON reviews FOR UPDATE
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "reviews_delete"          ON reviews FOR DELETE
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- Public SELECT yok. Slot availability için get_shop_slots RPC kullanılır.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_read" ON appointments FOR SELECT
  USING (
    user_id = auth.uid()
    OR shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "appointments_delete" ON appointments FOR DELETE
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- SLOT AVAILABILITY RPC — SECURITY DEFINER, PII sızdırmaz
-- Herkes (anon dahil) çağırabilir; sadece blocking slot bilgisi döner.
-- customer_name / user_id / phone dahil değil.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_shop_slots(
  p_shop_id INTEGER,
  p_dates   DATE[]
)
RETURNS TABLE (
  staff_id          UUID,
  appointment_date  DATE,
  appointment_time  TEXT,
  duration_snapshot INTEGER,
  status            TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    a.staff_id,
    a.appointment_date,
    a.appointment_time,
    COALESCE(a.duration_snapshot, 30),
    a.status
  FROM appointments a
  WHERE a.shop_id = p_shop_id
    AND a.appointment_date = ANY(p_dates)
    AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı');
$$;

GRANT EXECUTE ON FUNCTION get_shop_slots(INTEGER, DATE[]) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- SCORE TRIGGER — v_shop_id INTEGER (shops.id = int4)
-- Müşteri frontend'den shops.score update edemez; DB otomatik hesaplar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_shop_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_shop_id INTEGER;
  v_avg     NUMERIC;
BEGIN
  v_shop_id := COALESCE(NEW.shop_id, OLD.shop_id);
  SELECT ROUND(AVG(rating)::numeric, 1) INTO v_avg FROM reviews WHERE shop_id = v_shop_id;
  UPDATE shops SET score = COALESCE(v_avg, 0) WHERE id = v_shop_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_score ON reviews;
CREATE TRIGGER trg_reviews_score
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_update_shop_score();
