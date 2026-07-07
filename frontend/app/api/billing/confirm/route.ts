import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { stripe, periodEndFromSubscription, subscriptionUntilFromPeriodEnd, discountEndFromSubscription } from "../../../../lib/stripe";

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
    // %100 promosyon kodu uygulanmış (kart istenmeyen) oturumlarda Stripe
    // "paid" değil "no_payment_required" döner — bu da geçerli bir ödemedir.
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ ok: false, reason: "not_paid" }, { status: 402 });
    }

    const subId = typeof session.subscription === "object" && session.subscription
      ? session.subscription.id
      : (session.subscription as string | null);
    // Promosyon kodu uygulanmışsa Stripe indirimin TAM bitiş tarihini verir
    // (örn. RANDEZY2026 → 6 ay sonrası) — webhook'a bağımlı kalmadan bunu
    // ilk anda kullan. Yoksa normal aylık dönem sonuna düş.
    const discountEnd = discountEndFromSubscription(session.subscription);
    const periodEnd = periodEndFromSubscription(session.subscription);
    const effectiveEnd = discountEnd ?? periodEnd;
    const newUntil = effectiveEnd
      ? subscriptionUntilFromPeriodEnd(effectiveEnd)
      : new Date(Date.now() + 31 * 86400000).toISOString(); // emniyet: dönem okunamadıysa 31 gün

    // Yol A: işletme zaten vardı (yenileme/ilk ödeme sonrası dashboard akışı)
    const shopId = parseInt(session.metadata?.shop_id || "", 10);
    if (Number.isFinite(shopId)) {
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("id, owner_id, subscription_until")
        .eq("id", shopId)
        .maybeSingle();
      if (!shop || shop.owner_id !== user.id) {
        return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
      }
      // Geriye gitme: mevcut bitiş daha ilerideyse dokunma
      const finalUntil = new Date(newUntil) > new Date(shop.subscription_until ?? 0)
        ? newUntil
        : shop.subscription_until;

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
    }

    // Yol B: henüz işletmesi yok — ödeme kaydı profile "pending" olarak yazılır,
    // işletme formu gönderildiğinde /api/billing/attach-pending devreye girer.
    if (session.metadata?.owner_id === user.id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          pending_subscription_until: newUntil,
          pending_stripe_customer_id: (session.customer as string) ?? null,
          pending_stripe_subscription_id: subId,
        })
        .eq("id", user.id);

      console.log(`[billing/confirm] owner ${user.id} → ödeme alındı, pending until ${newUntil}`);
      return NextResponse.json({ ok: true, subscription_until: newUntil, pending: true });
    }

    return NextResponse.json({ ok: false, reason: "bad_session" }, { status: 400 });
  } catch (err) {
    console.error("[billing/confirm] error:", err);
    return NextResponse.json({ ok: false, reason: "stripe_error" }, { status: 500 });
  }
}
