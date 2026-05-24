-- Appointment overlap protection — database-level safety net
-- Run in Supabase SQL Editor.
--
-- Blocking statuses (occupy staff time):  pending, confirmed
-- Non-blocking statuses (free the slot):  cancelled, no_show, completed
--
-- "completed" is intentionally excluded from blocking because:
--   - Past completed appointments are irrelevant (nobody books past slots).
--   - A future appointment prematurely marked "completed" is a data error;
--     keeping its slot blocked would harm availability without benefit.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0 — Verify data before enabling Layer 2 (run this first)
-- Returns conflicting appointment pairs. Must return 0 rows before Layer 2.
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT
--     a1.id        AS id1,
--     a2.id        AS id2,
--     a1.staff_id,
--     a1.start_time AS start1,
--     a1.end_time   AS end1,
--     a2.start_time AS start2,
--     a2.end_time   AS end2
-- FROM biz_appointments a1
-- JOIN biz_appointments a2
--   ON a1.id < a2.id
--  AND a1.staff_id = a2.staff_id
--  AND a1.staff_id IS NOT NULL
--  AND a1.status NOT IN ('cancelled', 'no_show', 'completed')
--  AND a2.status NOT IN ('cancelled', 'no_show', 'completed')
--  AND a1.start_time < a2.end_time + interval '5 minutes'
--  AND a2.start_time < a1.end_time + interval '5 minutes';


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 1 — Exact same-slot unique index (safe to run immediately)
--
-- What it prevents:  two active appointments with the EXACT SAME start_time
--                    for the same staff member — catches the worst-case race.
-- What it does NOT prevent: 12:30–13:10 overlapping with 12:45 (different
--                    start_time). That protection lives in application logic
--                    (businesses.py + appointments.py + dashboard check).
-- ─────────────────────────────────────────────────────────────────────────────

-- Python-backend table (English enum values)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_biz_apts_no_exact_double
  ON biz_appointments (staff_id, start_time)
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show', 'completed');

-- Supabase-direct dashboard table (Turkish status strings)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı');


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 2 — Full duration-aware exclusion constraint (OPTIONAL, stronger)
--
-- What it prevents:  any overlapping time range (12:30–13:15 vs 12:45, etc.)
--                    for the same staff member, at the DB level.
-- Requires:          btree_gist extension + clean existing data (Step 0 = 0 rows).
-- NULL staff_id:     safe — NULL = NULL is FALSE in GiST, so NULL-staff
--                    appointments never conflict with each other here.
--                    Business-level protection for NULL staff lives in app code.
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE EXTENSION IF NOT EXISTS btree_gist;
--
-- ALTER TABLE biz_appointments ADD CONSTRAINT no_staff_time_overlap
--   EXCLUDE USING gist (
--     staff_id WITH =,
--     tstzrange(start_time, end_time + interval '5 minutes', '[)') WITH &&
--   )
--   WHERE (staff_id IS NOT NULL
--          AND status NOT IN ('cancelled', 'no_show', 'completed'));
--
-- When an appointment transitions to cancelled/no_show/completed, PostgreSQL
-- removes that row from the exclusion index, immediately freeing the slot.
-- Cancelling or completing does NOT require disabling the constraint.
