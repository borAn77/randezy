-- Appointment overlap protection — database-level safety net
-- Run in Supabase SQL Editor.
--
-- BLOCKING statuses (staff time is permanently occupied):
--   biz_appointments : pending, confirmed, completed
--   appointments     : Beklemede, Onaylandı, Tamamlandı
--
-- NON-BLOCKING statuses (slot freed for rebooking):
--   biz_appointments : cancelled, no_show
--   appointments     : İptal Edildi, Gelmedi
--
-- Rationale for completed/Tamamlandı being BLOCKING:
--   Staff physically performed a service in that time window.
--   The time range is permanently occupied for historical accuracy
--   and to prevent retroactive/manual bookings from overlapping real work.
--   It also keeps revenue statistics consistent with availability records.
--
-- TECH DEBT NOTE:
--   biz_appointments (Python FastAPI backend) and appointments (Supabase-direct
--   dashboard) are two separate tables with duplicate overlap logic.
--   HIGH PRIORITY: unify into one source of truth after beta.


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
--  AND a1.status NOT IN ('cancelled', 'no_show')
--  AND a2.status NOT IN ('cancelled', 'no_show')
--  AND a1.start_time < a2.end_time + interval '5 minutes'
--  AND a2.start_time < a1.end_time + interval '5 minutes';


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 1 — Exact same-slot unique index (safe to run immediately)
--
-- Prevents two blocking appointments from sharing the EXACT SAME start_time
-- for the same staff member. Handles the worst-case race condition.
-- Does NOT prevent 12:30–13:10 overlapping with 12:45 — that is app-layer logic.
-- ─────────────────────────────────────────────────────────────────────────────

-- Python-backend table (English enum values; completed is blocking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_apts_no_exact_double
  ON biz_appointments (staff_id, start_time)
  WHERE staff_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show');

-- Supabase-direct dashboard table (Turkish status strings; Tamamlandı is blocking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_exact_double
  ON appointments (shop_id, staff_id, appointment_date, appointment_time)
  WHERE staff_id IS NOT NULL
    AND status IN ('Beklemede', 'Onaylandı', 'Tamamlandı');


-- ─────────────────────────────────────────────────────────────────────────────
-- LAYER 2 — Full duration-aware exclusion constraint (OPTIONAL, stronger)
--
-- Blocks overlapping time ranges at DB level (not just exact duplicates).
-- Run Step 0 first. If it returns 0 rows, it is safe to enable this.
-- Requires btree_gist extension.
-- NULL staff_id: safe — NULL = NULL is FALSE in GiST; NULL-staff appointments
--   never conflict with each other here. Business-level protection for NULL
--   staff is handled in application code.
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE EXTENSION IF NOT EXISTS btree_gist;
--
-- ALTER TABLE biz_appointments ADD CONSTRAINT no_staff_time_overlap
--   EXCLUDE USING gist (
--     staff_id WITH =,
--     tstzrange(start_time, end_time + interval '5 minutes', '[)') WITH &&
--   )
--   WHERE (staff_id IS NOT NULL
--          AND status NOT IN ('cancelled', 'no_show'));
--
-- When an appointment transitions to cancelled or no_show, PostgreSQL removes
-- that row from the exclusion index, immediately freeing the slot.
-- completed appointments remain in the index — their time window stays blocked.
