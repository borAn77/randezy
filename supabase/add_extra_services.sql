-- ─────────────────────────────────────────────────────────────────────────────
-- Randezy — Ek Hizmetler (randevuya ek işlem / ürün satışı / walk-in çoklu hizmet)
-- Model: appointments'ta kardeş satırlar (is_extra + parent_appointment_id)
-- Ekstralar slot İŞGAL ETMEZ: overlap katmanlarından muaf tutulur.
-- Tekrar çalıştırmak güvenlidir (IF NOT EXISTS / OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Yeni kolonlar
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS parent_appointment_id UUID
    REFERENCES appointments(id) ON DELETE CASCADE;

UPDATE appointments SET is_extra = FALSE WHERE is_extra IS NULL;

-- Tutarlılık: ekstra ise parent zorunlu, değilse parent olamaz
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_extra_parent_chk;
ALTER TABLE appointments ADD CONSTRAINT appointments_extra_parent_chk
  CHECK (
    (COALESCE(is_extra, FALSE) = FALSE AND parent_appointment_id IS NULL)
    OR (is_extra = TRUE AND parent_appointment_id IS NOT NULL)
  );

-- 2) Parent index (cascade delete + detay sorguları)
CREATE INDEX IF NOT EXISTS idx_appointments_parent
  ON appointments (parent_appointment_id)
  WHERE parent_appointment_id IS NOT NULL;

-- 3) LAYER 1 — unique index'i ekstraları dışlayacak şekilde yeniden oluştur
--    (Ekstralar parent ile aynı staff+tarih+saat'e yazılır; eski index bunu reddederdi.)
DROP INDEX IF EXISTS idx_appointments_no_exact_double;
CREATE UNIQUE INDEX idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
    AND COALESCE(is_extra, FALSE) = FALSE;

-- 4) LAYER 2B — overlap trigger: ekstralar (a) kontrol edilmez (b) bloker sayılmaz
--    (overlap_protection.sql'deki fonksiyonun birebir aynısı + is_extra muafiyetleri)
CREATE OR REPLACE FUNCTION fn_check_appointment_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_duration  INTEGER;
  v_conflicts INTEGER;
BEGIN
  -- Her zaman önce snapshot doldur (historical integrity — iptal olsa bile)
  IF NEW.duration_snapshot IS NULL THEN
    SELECT COALESCE(duration, 30) INTO v_duration
    FROM services WHERE id = NEW.service_id;
    NEW.duration_snapshot := COALESCE(v_duration, 30);
  END IF;

  IF NEW.duration_snapshot < 1 THEN
    NEW.duration_snapshot := 30;
  END IF;

  -- Ek hizmet satırları slot işgal etmez — overlap kontrolüne girmez
  IF COALESCE(NEW.is_extra, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Sadece blocking status'lar için overlap kontrolü
  IF NEW.status NOT IN ('Beklemede', 'Onaylandı', 'Tamamlandı') THEN
    RETURN NEW;
  END IF;

  v_duration := NEW.duration_snapshot;

  IF NEW.staff_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments a
    WHERE a.id              != NEW.id
      AND a.shop_id          = NEW.shop_id
      AND a.staff_id         = NEW.staff_id
      AND a.appointment_date = NEW.appointment_date
      AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
      AND COALESCE(a.is_extra, FALSE) = FALSE
      AND NEW.appointment_time::time
            < a.appointment_time::time
              + (COALESCE(a.duration_snapshot, 30) + 5) * INTERVAL '1 minute'
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
    WHERE a.id              != NEW.id
      AND a.shop_id          = NEW.shop_id
      AND a.staff_id         IS NULL
      AND a.appointment_date = NEW.appointment_date
      AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
      AND COALESCE(a.is_extra, FALSE) = FALSE
      AND NEW.appointment_time::time
            < a.appointment_time::time
              + (COALESCE(a.duration_snapshot, 30) + 5) * INTERVAL '1 minute'
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
-- Not: trg_appointments_overlap_check trigger'ı aynı fonksiyona bağlı kalır,
-- CREATE OR REPLACE yeterli — trigger'ı yeniden oluşturmaya gerek yok.

-- 5) Müşteri booking slot RPC'si: ekstralar slot bloklamasın
--    (İmza rls_policies.sql'dekiyle birebir aynı — OR REPLACE güvenli, GRANT'lar korunur)
CREATE OR REPLACE FUNCTION get_shop_slots(p_shop_id INTEGER, p_dates DATE[])
RETURNS TABLE (staff_id UUID, appointment_date DATE, appointment_time TEXT,
               duration_snapshot INTEGER, status TEXT)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT a.staff_id, a.appointment_date, a.appointment_time,
         COALESCE(a.duration_snapshot, 30), a.status
  FROM appointments a
  WHERE a.shop_id = p_shop_id
    AND a.appointment_date = ANY(p_dates)
    AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
    AND COALESCE(a.is_extra, FALSE) = FALSE;
$$;

COMMIT;

-- ─── DOĞRULAMA ───
-- Kolonlar var mı? (2 satır dönmeli)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'appointments' AND column_name IN ('is_extra', 'parent_appointment_id');
-- Yeni index predicate'i is_extra içeriyor mu?
SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_appointments_no_exact_double';
