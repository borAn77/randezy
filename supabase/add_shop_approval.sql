-- ============================================================
-- İŞLETME ÖN ONAY SİSTEMİ (Faz 1) — 2026-07-06
-- Yeni kaydolan işletmeler 'pending' başlar; admin onaylayana
-- kadar müşterilere GÖRÜNMEZ (RLS seviyesinde, API dahil).
-- Sahibi kendi işletmesini her durumda görür ve panelini hazırlar.
--
-- ONAY / RED NASIL YAPILIR:
--   Supabase → Table Editor → shops → approval_status alanını
--   'approved' (onay) veya 'rejected' (red) yap.
--   Onay öncesi kontrol listesi:
--     1) Google Maps'te işletme var mı, adres/fotoğraf eşleşiyor mu?
--     2) İşletmenin HERKESE AÇIK numarasını ara, kaydı teyit et.
--     3) Şüphe varsa vergi levhası iste (İVD'den doğrula).
-- ============================================================

-- 1) Kolon: pending / approved / rejected
alter table public.shops
  add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending', 'approved', 'rejected'));

-- 2) Tek seferlik backfill: mevcut işletmeler zaten canlıda, onaylı say
update public.shops set approval_status = 'approved' where approval_status = 'pending';

-- 3) Liste sorguları için indeks
create index if not exists idx_shops_approval on public.shops (approval_status);

-- 4) RLS kapısı: onaysız işletmeyi sahibinden başkası okuyamaz.
--    RESTRICTIVE policy mevcut permissive policy'lerle AND'lenir;
--    service_role RLS'e tabi olmadığından API route'ları etkilenmez.
drop policy if exists shops_approval_gate on public.shops;
create policy shops_approval_gate on public.shops
  as restrictive
  for select
  to public
  using (approval_status = 'approved' or owner_id = auth.uid());
