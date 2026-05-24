-- Add owner reply columns to reviews table
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS owner_reply TEXT,
  ADD COLUMN IF NOT EXISTS owner_reply_at TIMESTAMPTZ;
