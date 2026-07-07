-- ============================================================
-- PROMO KOD — İŞLETMEDEN ÖNCE KULLANIM DESTEĞİ — 2026-07-07
-- "Hemen Başla" artık Stripe'a gitmeden önce promo kod sorabiliyor.
-- O anda işletme henüz yok, ama kullanıcı (owner) zaten var — bu yüzden
-- promo_redemptions artık shop_id yerine owner_id ile de kayıt tutabilir.
-- İşletme oluşunca (attach-pending) bu kayıt gerçek shop_id'ye bağlanır.
-- ============================================================

alter table public.promo_redemptions
  alter column shop_id drop not null,
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Aynı owner aynı kodu işletme oluşturmadan önce iki kez kullanamasın
create unique index if not exists promo_redemptions_code_owner_uniq
  on public.promo_redemptions (promo_code_id, owner_id)
  where owner_id is not null;
