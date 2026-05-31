-- Add role column to staff table (used for display label like "Kuaför", "Berber")
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role TEXT;
