import Stripe from "stripe";

// Stripe istemcisi + ortak yardımcılar.
// Canlıya geçiş: STRIPE_SECRET_KEY / STRIPE_PRICE_ID env'lerini live değerlerle değiştir.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Abonelik dönem sonunu API sürümünden bağımsız oku
// (yeni Stripe sürümlerinde current_period_end subscription item'a taşındı).
export function periodEndFromSubscription(sub: unknown): number | null {
  const s = sub as { items?: { data?: { current_period_end?: number }[] }; current_period_end?: number } | null;
  const end = s?.items?.data?.[0]?.current_period_end ?? s?.current_period_end;
  return typeof end === "number" ? end : null;
}

// Dönem sonu + 3 gün tolerans (banka gecikmeleri için)
export function subscriptionUntilFromPeriodEnd(periodEndSec: number): string {
  return new Date((periodEndSec + 3 * 86400) * 1000).toISOString();
}
