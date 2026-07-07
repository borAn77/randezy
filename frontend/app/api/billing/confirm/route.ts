import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { stripe, periodEndFromSubscription, subscriptionUntilFromPeriodEnd } from "../../../../lib/stripe";

// Checkout dönüşünde ödemeyi Stripe'tan doğrulayıp aboneliği işler.
// Webhook'un yedeği: kullanıcı success_url'e döner dönmez süre uzasın diye.
// İdempotent — aynı session tekrar onaylanırsa süre değişmez (period_end sabittir).
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ ok: false, reason: "billing_not_configured" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || "");
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, reason: "not_paid" }, { status: 402 });
    }

    const shopId = parseInt(session.metadata?.shop_id || "", 10);
    if (!Number.isFinite(shopId)) {
      return NextResponse.json({ ok: false, reason: "bad_session" }, { status: 400 });
    }

    // Oturum gerçekten bu kullanıcının işletmesine mi ait?
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, owner_id, subscription_until")
      .eq("id", shopId)
      .maybeSingle();
    if (!shop || shop.owner_id !== user.id) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    const periodEnd = periodEndFromSubscription(session.subscription);
    const newUntil = periodEnd
      ? subscriptionUntilFromPeriodEnd(periodEnd)
      : new Date(Date.now() + 31 * 86400000).toISOString(); // emniyet: dönem okunamadıysa 31 gün

    // Geriye gitme: mevcut bitiş daha ilerideyse dokunma
    const finalUntil = new Date(newUntil) > new Date(shop.subscription_until ?? 0)
      ? newUntil
      : shop.subscription_until;

    const subId = typeof session.subscription === "object" && session.subscription
      ? session.subscription.id
      : (session.subscription as string | null);

    await supabaseAdmin
      .from("shops")
      .update({
        subscription_until: finalUntil,
        stripe_customer_id: (session.customer as string) ?? null,
        stripe_subscription_id: subId,
      })
      .eq("id", shopId);

    console.log(`[billing/confirm] shop ${shopId} → paid, until ${finalUntil}`);
    return NextResponse.json({ ok: true, subscription_until: finalUntil });
  } catch (err) {
    console.error("[billing/confirm] error:", err);
    return NextResponse.json({ ok: false, reason: "stripe_error" }, { status: 500 });
  }
}
