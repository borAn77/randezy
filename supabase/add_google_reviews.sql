-- ============================================================
-- GOOGLE YORUMLARI ENTEGRASYONU — 2026-07-07
-- İşletme sahibi kendi Google Maps kaydını bağlar; puan + son 5
-- yorum cache'lenip işletme sayfasında gösterilir. Google Places
-- API'nin kendi kısıtı: en fazla 5 yorum döner (tüm yorumlar değil).
-- ============================================================

alter table public.shops
  add column if not exists google_place_id text,
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_review_count integer,
  add column if not exists google_reviews jsonb,
  add column if not exists google_reviews_synced_at timestamptz;

-- Aynı Google işletmesi iki farklı Randezy hesabına bağlanmasın
create unique index if not exists shops_google_place_id_uniq
  on public.shops (google_place_id)
  where google_place_id is not null;
