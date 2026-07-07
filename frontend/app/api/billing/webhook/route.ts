import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { stripe, periodEndFromSubscription, subscriptionUntilFromPeriodEnd, discountEndFromSubscription } from "../../../../lib/stripe";

// Stripe webhook — özellikle AYLIK YENİLEMELER için (invoice.paid).
// Kurulum: Stripe Dashboard → Developers → Webhooks → endpoint:
//   https://www.randezy.com/api/billing/webhook  (event: invoice.paid)
// → "Signing secret"i Vercel'e STRIPE_WEBHOOK_SECRET olarak ekle.
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ ok: false, reason: "billing_not_configured" }, { status: 503 });
  }
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    // Secret tanımlı değilken istek KABUL EDİLMEZ — imzasız çağrıya süre uzatılmaz.
    return NextResponse.json({ ok: false, reason: "webhook_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
  } catch (err) {
    console.error("[billing/webhook] imza doğrulanamadı:", err);
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 400 });
  }

  try {
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as { subscription?: string | null; customer?: string | null; parent?: { subscription_details?: { subscription?: string } } };
      const subId = invoice.subscription
        ?? invoice.parent?.subscription_details?.subscription
        ?? null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const shopId = parseInt(sub.metadata?.shop_id || "", 10);
        // Promosyon kod indirimi varsa (örn. RANDEZY2026, 6 ay) tam bitiş
        // tarihini kullan; yoksa normal aylık dönem sonu.
        const effectiveEnd = discountEndFromSubscription(sub) ?? periodEndFromSubscription(sub);
        if (Number.isFinite(shopId) && effectiveEnd) {
          const until = subscriptionUntilFromPeriodEnd(effectiveEnd);
          const { data: shop } = await supabaseAdmin
            .from("shops")
            .select("subscription_until")
            .eq("id", shopId)
            .maybeSingle();
          // Geriye gitme koruması: confirm.ts zaten 6 ayı baştan vermiş
          // olabilir — aylık invoice.paid bunu asla kısaltmasın.
          if (shop && new Date(until) <= new Date(shop.subscription_until ?? 0)) {
            console.log(`[billing/webhook] shop ${shopId} zaten daha ileri tarihte (${shop.subscription_until}), atlandı`);
          } else {
            await supabaseAdmin
              .from("shops")
              .update({
                subscription_until: until,
                stripe_customer_id: (invoice.customer as string) ?? null,
                stripe_subscription_id: subId,
              })
              .eq("id", shopId);
            console.log(`[billing/webhook] invoice.paid → shop ${shopId} until ${until}`);
          }
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook] işleme hatası:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
