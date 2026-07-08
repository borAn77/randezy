import Stripe from "stripe";

// Stripe istemcisi + ortak yardımcılar.
// Canlıya geçiş: STRIPE_SECRET_KEY / STRIPE_PRICE_ID env'lerini live değerlerle değiştir.
//
// apiVersion BİLEREK sabitlendi (hesabın varsayılanı değil): bu hesabın
// dashboard-varsayılan sürümü (2026-06-24) bazı standart parametreleri
// (örn. promotion_codes.create → coupon) tanımıyor/yeniden adlandırmış.
// Kararlı, belgelenmiş bir sürüme kilitlemek gelecekteki sürpriz
// kırılmaları önler. Yükseltmeden önce Stripe'ın changelog'una bak.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STRIPE_CONFIG = { apiVersion: "2024-06-20" } as any;
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG)
  : null;

// Abonelik dönem sonunu API sürümünden bağımsız oku
// (yeni Stripe sürümlerinde current_period_end subscription item'a taşındı).
export function periodEndFromSubscription(sub: unknown): number | null {
  const s = sub as { items?: { data?: { current_period_end?: number }[] }; current_period_end?: number } | null;
  const end = s?.items?.data?.[0]?.current_period_end ?? s?.current_period_end;
  return typeof end === "number" ? end : null;
}

// Promosyon kodu (örn. RANDEZY2026, 6 ay %100 indirim) uygulanmışsa Stripe
// indirimin TAM bitiş tarihini "discount.end"de verir — webhook'un her ay
// çalışmasına bağımlı kalmadan tüm süreyi ilk anda garantiye almak için.
export function discountEndFromSubscription(sub: unknown): number | null {
  const s = sub as { discount?: { end?: number | null } | null } | null;
  const end = s?.discount?.end;
  return typeof end === "number" ? end : null;
}

// Dönem sonu + 3 gün tolerans (banka gecikmeleri için)
export function subscriptionUntilFromPeriodEnd(periodEndSec: number): string {
  return new Date((periodEndSec + 3 * 86400) * 1000).toISOString();
}
