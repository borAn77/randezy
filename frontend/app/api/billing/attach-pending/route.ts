import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { stripe } from "../../../../lib/stripe";

// İşletme formu gönderildikten sonra çağrılır: kullanıcı "Hemen Başla"
// akışıyla işletmesinden ÖNCE ödeme yapmışsa (bkz. billing/confirm Yol B),
// o ödemenin süresini yeni oluşturulan işletmeye aktarır.
// Ödeme yoksa sessizce no-op döner — akışı hiçbir zaman kesmez.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const shopId = parseInt(body.shopId, 10);
  if (!Number.isFinite(shopId)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, owner_id, subscription_until")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop || shop.owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pending_subscription_until, pending_stripe_customer_id, pending_stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.pending_subscription_until) {
    return NextResponse.json({ ok: true, applied: false });
  }

  const finalUntil = new Date(profile.pending_subscription_until) > new Date(shop.subscription_until ?? 0)
    ? profile.pending_subscription_until
    : shop.subscription_until;

  await supabaseAdmin
    .from("shops")
    .update({
      subscription_until: finalUntil,
      stripe_customer_id: profile.pending_stripe_customer_id,
      stripe_subscription_id: profile.pending_stripe_subscription_id,
    })
    .eq("id", shopId);

  // Aylık yenileme webhook'u shop_id'yi buradan okuyacak — yoksa gelecekteki
  // invoice.paid olayları hiçbir işletmeye bağlanamaz.
  if (stripe && profile.pending_stripe_subscription_id) {
    try {
      await stripe.subscriptions.update(profile.pending_stripe_subscription_id, {
        metadata: { shop_id: String(shopId) },
      });
    } catch (err) {
      console.error("[billing/attach-pending] Stripe metadata güncellenemedi:", err);
    }
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      pending_subscription_until: null,
      pending_stripe_customer_id: null,
      pending_stripe_subscription_id: null,
    })
    .eq("id", user.id);

  // Promo koddan geldiyse (redeem-pending), owner_id ile tutulan kaydı
  // gerçek shop_id'ye bağla — admin panelinde işletme adı görünsün.
  await supabaseAdmin
    .from("promo_redemptions")
    .update({ shop_id: shopId })
    .eq("owner_id", user.id)
    .is("shop_id", null);

  console.log(`[billing/attach-pending] shop ${shopId} ← owner ${user.id} bekleyen ödeme aktarıldı, until ${finalUntil}`);
  return NextResponse.json({ ok: true, applied: true, subscription_until: finalUntil });
}
