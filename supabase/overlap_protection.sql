-- ══════════════════════════════════════════════════════════════════════════════
-- Randezy — Appointment Overlap Protection
-- Run sections in Supabase SQL Editor one at a time.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- TWO TABLES, TWO PATHS:
--
--   biz_appointments   Python FastAPI backend
--                      UUID ids, TIMESTAMPTZ start_time / end_time
--                      English enum statuses: pending, confirmed, completed,
--                                             cancelled, no_show
--
--   appointments       Supabase-direct (shop page + dashboard)
--                      INTEGER shop_id, DATE appointment_date,
--                      TEXT appointment_time (HH:MM), INTEGER service_id,
--                      TEXT status (Turkish strings)
--                      ⚠  NO end-time or duration column — must be added
--
-- BLOCKING statuses (staff time is permanently occupied):
--   biz_appointments : pending, confirmed, completed
--   appointments     : Beklemede, Onaylandı, Tamamlandı
--
-- NON-BLOCKING statuses (slot freed for rebooking):
--   biz_appointments : cancelled, no_show
--   appointments     : İptal Edildi, Gelmedi
--
-- BUFFER: 5 minutes between any two appointments on the same staff.
--
-- TECH DEBT: unify the two tables after beta.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 1 — Exact same-slot unique index  (already deployed, safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_apts_no_exact_double
  ON biz_appointments (staff_id, start_time)
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı');


-- ══════════════════════════════════════════════════════════════════════════════
-- LAYER 2 PREPARATION — Run all STEP 0 queries and verify before any migration
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0A — Schema inspection: does appointments have a duration_snapshot?
-- Expected: 0 rows (column does not exist yet).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN ('duration_snapshot', 'appointment_end_time', 'end_time');


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0B — Verify biz_appointments data is clean (no existing overlaps).
-- Must return 0 rows before enabling Layer 2 exclusion constraint.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    a1.id        AS id1,
    a2.id        AS id2,
    a1.staff_id,
    a1.start_time AS start1,
    a1.end_time   AS end1,
    a2.start_time AS start2,
    a2.end_time   AS end2
FROM biz_appointments a1
JOIN biz_appointments a2
  ON a1.id < a2.id
 AND a1.staff_id = a2.staff_id
 AND a1.staff_id IS NOT NULL
 AND a1.status NOT IN ('cancelled', 'no_show')
 AND a2.status NOT IN ('cancelled', 'no_show')
 -- Two-sided buffer: each appointment needs 5 min gap from the other
 AND a1.start_time < a2.end_time   + INTERVAL '5 minutes'
 AND a2.start_time < a1.end_time   + INTERVAL '5 minutes';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0C — Verify appointments data is clean (joins services for duration).
-- Must return 0 rows before enabling Layer 2 trigger/constraint.
-- NULL service_id rows fall back to 30-minute assumed duration — review them.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    a1.id                    AS id1,
    a2.id                    AS id2,
    a1.staff_id,
    a1.shop_id,
    a1.appointment_date,
    a1.appointment_time      AS start1,
    a2.appointment_time      AS start2,
    COALESCE(s1.duration,30) AS dur1_min,
    COALESCE(s2.duration,30) AS dur2_min
FROM appointments a1
JOIN appointments a2
  ON a1.id < a2.id
 AND a1.shop_id  = a2.shop_id
 AND a1.staff_id = a2.staff_id
 AND a1.staff_id IS NOT NULL
 AND a1.appointment_date = a2.appointment_date
 AND a1.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
 AND a2.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
LEFT JOIN services s1 ON s1.id = a1.service_id
LEFT JOIN services s2 ON s2.id = a2.service_id
WHERE
    -- a1 starts before a2 ends (+ buffer)
    a1.appointment_time::time
      < a2.appointment_time::time
        + (COALESCE(s2.duration, 30) + 5) * INTERVAL '1 minute'
    -- a1 ends (+ buffer) after a2 starts
    AND a1.appointment_time::time
        + (COALESCE(s1.duration, 30) + 5) * INTERVAL '1 minute'
      > a2.appointment_time::time;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0D — Null staff_id audit: appointments where staff_id IS NULL.
-- These are covered by shop-level overlap logic, not staff-level.
-- Review: are there same-shop, same-date, same-time, null-staff conflicts?
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    a1.id AS id1, a2.id AS id2,
    a1.shop_id,
    a1.appointment_date,
    a1.appointment_time AS start1,
    a2.appointment_time AS start2,
    COALESCE(s1.duration,30) AS dur1_min,
    COALESCE(s2.duration,30) AS dur2_min
FROM appointments a1
JOIN appointments a2
  ON a1.id < a2.id
 AND a1.shop_id = a2.shop_id
 AND a1.staff_id IS NULL
 AND a2.staff_id IS NULL
 AND a1.appointment_date = a2.appointment_date
 AND a1.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
 AND a2.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
LEFT JOIN services s1 ON s1.id = a1.service_id
LEFT JOIN services s2 ON s2.id = a2.service_id
WHERE
    a1.appointment_time::time
      < a2.appointment_time::time
        + (COALESCE(s2.duration, 30) + 5) * INTERVAL '1 minute'
    AND a1.appointment_time::time
        + (COALESCE(s1.duration, 30) + 5) * INTERVAL '1 minute'
      > a2.appointment_time::time;


-- ══════════════════════════════════════════════════════════════════════════════
-- LAYER 2A — biz_appointments exclusion constraint
-- PREREQUISITE: STEP 0B returns 0 rows.
-- Requires btree_gist extension.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Design notes:
--   • end_time already stored → tstzrange works directly
--   • Buffer (+5 min) baked into the upper bound of each range
--   • completed intentionally included (staff physically worked that slot)
--   • NULL staff_id excluded from gist index (NULL != NULL in gist; safe)
--   • When status changes to cancelled/no_show, row leaves the partial index
--     and the slot is immediately freed for rebooking
--
-- Uncomment and run ONLY after STEP 0B returns 0 rows:

-- CREATE EXTENSION IF NOT EXISTS btree_gist;
--
-- ALTER TABLE biz_appointments ADD CONSTRAINT no_biz_apt_staff_overlap
--   EXCLUDE USING gist (
--     staff_id WITH =,
--     tstzrange(start_time, end_time + INTERVAL '5 minutes', '[)') WITH &&
--   )
--   WHERE (
--     staff_id IS NOT NULL
--     AND status NOT IN ('cancelled', 'no_show')
--   );


-- ══════════════════════════════════════════════════════════════════════════════
-- LAYER 2B — appointments trigger-based overlap guard
--
-- Why a trigger and not an exclusion constraint?
--   The appointments table stores appointment_date (DATE) + appointment_time
--   (TEXT HH:MM) but has no end_time or duration column. An exclusion
--   constraint needs both endpoints. We must either:
--     (a) Add duration_snapshot INTEGER column + backfill (schema change), or
--     (b) Use a BEFORE INSERT/UPDATE trigger that queries services.duration
--         at runtime — zero schema change, works on existing rows as-is.
--
--   Option (b) is chosen for beta safety. Post-beta, add duration_snapshot
--   and replace the trigger with a proper exclusion constraint (see LAYER 2C).
--
-- PREREQUISITE: STEP 0C AND 0D return 0 rows.
-- Safe to enable even with dirty data — only blocks future inserts/updates.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Uncomment and run ONLY after STEP 0C + 0D return 0 rows:

-- CREATE OR REPLACE FUNCTION fn_check_appointment_overlap()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- DECLARE
--   v_duration   INTEGER;
--   v_conflicts  INTEGER;
-- BEGIN
--   -- Only check blocking statuses; ignore cancellations / no-shows
--   IF NEW.status NOT IN ('Beklemede', 'Onaylandı', 'Tamamlandı') THEN
--     RETURN NEW;
--   END IF;
--
--   -- Look up duration from services table (fallback 30 min if orphaned row)
--   SELECT COALESCE(duration, 30) INTO v_duration
--   FROM services WHERE id = NEW.service_id;
--   v_duration := COALESCE(v_duration, 30);
--
--   -- ── Staff-assigned appointment ─────────────────────────────────────────
--   IF NEW.staff_id IS NOT NULL THEN
--     SELECT COUNT(*) INTO v_conflicts
--     FROM appointments a
--     JOIN services s ON s.id = a.service_id
--     WHERE a.id         != NEW.id   -- exclude self on UPDATE
--       AND a.shop_id     = NEW.shop_id
--       AND a.staff_id    = NEW.staff_id
--       AND a.appointment_date = NEW.appointment_date
--       AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
--       AND (
--         -- NEW starts before EXISTING ends (+ buffer)
--         NEW.appointment_time::time
--           < a.appointment_time::time
--             + (COALESCE(s.duration, 30) + 5) * INTERVAL '1 minute'
--         AND
--         -- NEW ends (+ buffer) after EXISTING starts
--         NEW.appointment_time::time
--           + (v_duration + 5) * INTERVAL '1 minute'
--           > a.appointment_time::time
--       );
--
--     IF v_conflicts > 0 THEN
--       RAISE EXCEPTION
--         'Bu personel için bu saat aralığında çakışan randevu var.'
--         USING ERRCODE = '23P01';
--     END IF;
--
--   -- ── Unassigned appointment (no staff) — shop-level check ───────────────
--   ELSE
--     SELECT COUNT(*) INTO v_conflicts
--     FROM appointments a
--     JOIN services s ON s.id = a.service_id
--     WHERE a.id         != NEW.id
--       AND a.shop_id     = NEW.shop_id
--       AND a.staff_id    IS NULL
--       AND a.appointment_date = NEW.appointment_date
--       AND a.status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
--       AND (
--         NEW.appointment_time::time
--           < a.appointment_time::time
--             + (COALESCE(s.duration, 30) + 5) * INTERVAL '1 minute'
--         AND
--         NEW.appointment_time::time
--           + (v_duration + 5) * INTERVAL '1 minute'
--           > a.appointment_time::time
--       );
--
--     IF v_conflicts > 0 THEN
--       RAISE EXCEPTION
--         'Bu dükkan için bu saat aralığında çakışan randevu var.'
--         USING ERRCODE = '23P01';
--     END IF;
--   END IF;
--
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER trg_appointments_overlap_check
--   BEFORE INSERT OR UPDATE ON appointments
--   FOR EACH ROW EXECUTE FUNCTION fn_check_appointment_overlap();


-- ══════════════════════════════════════════════════════════════════════════════
-- LAYER 2C — appointments exclusion constraint (post-beta upgrade path)
--
-- After beta, replace the trigger with this set-based constraint.
-- Requires: adding duration_snapshot INTEGER to appointments + backfill.
-- Only safe after trigger has been live for a full release cycle.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- MIGRATION ORDER (do NOT run yet — for reference only):
--
-- 1. Add column:
-- ALTER TABLE appointments
--   ADD COLUMN IF NOT EXISTS duration_snapshot INTEGER;
--
-- 2. Backfill from services:
-- UPDATE appointments a
-- SET duration_snapshot = COALESCE(s.duration, 30)
-- FROM services s
-- WHERE s.id = a.service_id
--   AND a.duration_snapshot IS NULL;
--
-- UPDATE appointments SET duration_snapshot = 30
-- WHERE duration_snapshot IS NULL;  -- orphaned rows with no service_id
--
-- 3. Add NOT NULL constraint after backfill is verified:
-- ALTER TABLE appointments
--   ALTER COLUMN duration_snapshot SET NOT NULL;
-- -- Add trigger to auto-fill on future inserts:
-- CREATE OR REPLACE FUNCTION fn_fill_duration_snapshot()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- BEGIN
--   IF NEW.duration_snapshot IS NULL THEN
--     SELECT COALESCE(duration, 30) INTO NEW.duration_snapshot
--     FROM services WHERE id = NEW.service_id;
--     NEW.duration_snapshot := COALESCE(NEW.duration_snapshot, 30);
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- CREATE TRIGGER trg_fill_duration_snapshot
--   BEFORE INSERT ON appointments
--   FOR EACH ROW EXECUTE FUNCTION fn_fill_duration_snapshot();
--
-- 4. Drop trigger from Layer 2B (replaced by constraint below).
-- DROP TRIGGER IF EXISTS trg_appointments_overlap_check ON appointments;
-- DROP FUNCTION IF EXISTS fn_check_appointment_overlap();
--
-- 5. Add exclusion constraint (after Step 0C returns 0 rows):
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- ALTER TABLE appointments ADD CONSTRAINT no_apt_staff_overlap
--   EXCLUDE USING gist (
--     shop_id WITH =,
--     staff_id WITH =,
--     tsrange(
--       (appointment_date::text || ' ' || appointment_time)::timestamp,
--       (appointment_date::text || ' ' || appointment_time)::timestamp
--         + (duration_snapshot + 5) * INTERVAL '1 minute',
--       '[)'
--     ) WITH &&
--   )
--   WHERE (
--     staff_id IS NOT NULL
--     AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
--   );
--
-- 6. Separate constraint for no-staff shops (staff_id IS NULL):
-- ALTER TABLE appointments ADD CONSTRAINT no_apt_shop_overlap
--   EXCLUDE USING gist (
--     shop_id WITH =,
--     tsrange(
--       (appointment_date::text || ' ' || appointment_time)::timestamp,
--       (appointment_date::text || ' ' || appointment_time)::timestamp
--         + (duration_snapshot + 5) * INTERVAL '1 minute',
--       '[)'
--     ) WITH &&
--   )
--   WHERE (
--     staff_id IS NULL
--     AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı')
--   );
