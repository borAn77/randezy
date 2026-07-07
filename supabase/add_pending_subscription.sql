-- ============================================================
-- ÖDEME-ÖNCE-İŞLETME AKIŞI — 2026-07-07
-- "Hemen Başla" artık önce ödeme sayfasına gönderiyor; işletme henüz
-- oluşmadığı için ödeme kaydı profile geçici (pending) olarak yazılır,
-- işletme formu gönderildiğinde bu kayıt yeni işletmeye aktarılır.
-- Sadece service_role API'leri (checkout/confirm/attach-pending) yazar.
-- ============================================================

alter table public.profiles
  add column if not exists pending_subscription_until timestamptz,
  add column if not exists pending_stripe_customer_id text,
  add column if not exists pending_stripe_subscription_id text;
