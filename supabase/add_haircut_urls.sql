-- Add haircut_urls column to shops table for "Favori Kesimlerim" feature
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS haircut_urls TEXT[] DEFAULT '{}';
