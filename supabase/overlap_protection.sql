-- Appointment overlap protection — database-level safety net
-- Run in Supabase SQL Editor.
--
-- BEFORE running Layer 2 (exclusion constraint), verify no existing overlaps:
--
--   SELECT a1.id, a2.id
--   FROM biz_appointments a1
--   JOIN biz_appointments a2
--     ON a1.id < a2.id
--    AND a1.staff_id = a2.staff_id
--    AND a1.staff_id IS NOT NULL
--    AND a1.status NOT IN ('cancelled', 'no_show')
--    AND a2.status NOT IN ('cancelled', 'no_show')
--    AND a1.start_time < a2.end_time + interval '5 minutes'
--    AND a2.start_time < a1.end_time + interval '5 minutes';
--
-- If that query returns rows, resolve the conflicts before running Layer 2.

-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 1 — Exact same-slot unique index (minimal, always safe to run)
-- Prevents two active appointments sharing the identical start_time + staff.
-- Does NOT catch overlapping-but-different-time bookings (that is Layer 2).
-- CONCURRENTLY means the index build does not lock the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Python-backend table
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_biz_apts_no_exact_double
  ON biz_appointments (staff_id, start_time)
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show');

-- Supabase-direct dashboard table (Turkish status values)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı');


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 2 — Full duration-aware exclusion constraint (OPTIONAL, stronger)
-- Blocks overlapping time ranges, not just exact duplicates.
-- Requires btree_gist extension and clean existing data (see query above).
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE EXTENSION IF NOT EXISTS btree_gist;
--
-- ALTER TABLE biz_appointments ADD CONSTRAINT no_staff_time_overlap
--   EXCLUDE USING gist (
--     staff_id WITH =,
--     tstzrange(start_time, end_time + interval '5 minutes', '[)') WITH &&
--   )
--   WHERE (staff_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'));
--
-- When an appointment is cancelled/no_show, it leaves the exclusion index
-- automatically, immediately allowing rebooking of that slot.
