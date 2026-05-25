-- ══════════════════════════════════════════════════════════════════════════════
-- Randezy — Appointment Overlap Protection
-- DURUM: Tüm katmanlar deploy edildi (2026-05-25)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- BLOCKING statuses:
--   biz_appointments : pending, confirmed, completed
--   appointments     : Beklemede, Onaylandı, Tamamlandı
--
-- NON-BLOCKING statuses:
--   biz_appointments : cancelled, no_show
--   appointments     : İptal Edildi, Gelmedi
--
-- BUFFER: Her iki randevu arasında minimum 5 dakika.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 1 — Exact same-slot unique index
-- ✅ Deploy edildi. IF NOT EXISTS olduğu için tekrar çalıştırmak güvenli.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_apts_no_exact_double
  ON biz_appointments (staff_id, start_time)
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı');


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 2A — biz_appointments GiST exclusion constraint
-- ✅ Deploy edildi.
-- Tekrar çalıştırmak gerekirse: önce constraint'i drop et, sonra tekrar ekle.
--   DROP FUNCTION IF EXISTS biz_apt_range(timestamptz, timestamptz);
--   ALTER TABLE biz_appointments DROP CONSTRAINT IF EXISTS no_biz_apt_staff_overlap;
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION biz_apt_range(s timestamptz, e timestamptz)
RETURNS tstzrange
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT tstzrange(s, e + INTERVAL '5 minutes', '[)')
$$;

ALTER TABLE biz_appointments ADD CONSTRAINT no_biz_apt_staff_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    biz_apt_range(start_time, end_time) WITH &&
  )
  WHERE (
    staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 2B — appointments overlap trigger
-- ✅ Deploy edildi.
-- CREATE OR REPLACE olduğu için tekrar çalıştırmak güvenli.
-- Kapsam: staff-assigned → staff-level, staff=NULL → shop-level kontrol.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_check_appointment_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_duration  INTEGER;
  v_conflicts INTEGER;
BEGIN
  IF NEW.status NOT IN ('Beklemede', 'Onaylandı', 'Tamamlandı') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(duration, 30) INTO v_duration
  FROM services WHERE id = NEW.service_id;
  v_duration := COALESCE(v_duration, 30);

  IF NEW.staff_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.id             != NEW.id
      AND a.shop_id         = NEW.shop_id
      AND a.staff_id        = NEW.staff_id
      AND a.appointment_date = NEW.appointment_date
      AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
      AND NEW.appointment_time::time
            < a.appointment_time::time
              + (COALESCE(s.duration, 30) + 5) * INTERVAL '1 minute'
      AND NEW.appointment_time::time
            + (v_duration + 5) * INTERVAL '1 minute'
            > a.appointment_time::time;

    IF v_conflicts > 0 THEN
      RAISE EXCEPTION 'Bu personel için bu saat aralığında çakışan randevu var.'
        USING ERRCODE = '23P01';
    END IF;

  ELSE
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.id             != NEW.id
      AND a.shop_id         = NEW.shop_id
      AND a.staff_id        IS NULL
      AND a.appointment_date = NEW.appointment_date
      AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
      AND NEW.appointment_time::time
            < a.appointment_time::time
              + (COALESCE(s.duration, 30) + 5) * INTERVAL '1 minute'
      AND NEW.appointment_time::time
            + (v_duration + 5) * INTERVAL '1 minute'
            > a.appointment_time::time;

    IF v_conflicts > 0 THEN
      RAISE EXCEPTION 'Bu dükkan için bu saat aralığında çakışan randevu var.'
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_overlap_check ON appointments;

CREATE TRIGGER trg_appointments_overlap_check
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_check_appointment_overlap();


-- ─────────────────────────────────────────────────────────────────────────────
-- DOĞRULAMA — Her şeyin aktif olduğunu kontrol et
-- ─────────────────────────────────────────────────────────────────────────────

-- Layer 2A constraint aktif mi? (1 satır dönmeli)
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'no_biz_apt_staff_overlap';

-- Layer 2B trigger aktif mi? (1 satır dönmeli)
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_appointments_overlap_check';
