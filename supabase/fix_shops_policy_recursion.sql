-- ============================================================
-- ACİL FİX — 2026-07-07: shops görünürlük policy'sinde sonsuz döngü
-- Sebep: policy içindeki appointments EXISTS sorgusu, appointments'ın
-- kendi RLS'i shops'a baktığı için döngüye giriyordu (42P17) ve tüm
-- anon shop okumaları hata veriyordu.
-- Çözüm: randevu kontrolü SECURITY DEFINER fonksiyona alındı
-- (fonksiyon RLS'e takılmadan appointments'a bakar → döngü kırılır).
-- ============================================================

create or replace function public.user_has_appointment_at(p_shop_id integer)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.appointments a
    where a.shop_id = p_shop_id
      and a.user_id = auth.uid()
  );
$$;

revoke all on function public.user_has_appointment_at(integer) from public;
grant execute on function public.user_has_appointment_at(integer) to anon, authenticated;

drop policy if exists shops_visibility_gate on public.shops;
create policy shops_visibility_gate on public.shops
  as restrictive
  for select
  to public
  using (
    (approval_status = 'approved' and subscription_until > now())
    or owner_id = auth.uid()
    or public.user_has_appointment_at(id)
  );
