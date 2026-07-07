import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { stripe } from "../../../../lib/stripe";

// İşletme sahibi için Stripe Checkout (abonelik) oturumu oluşturur.
export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ ok: false, reason: "billing_not_configured" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  // İşletmesi olan sahibi için "yenileme" akışı; henüz işletmesi olmayan
  // yeni kullanıcı için "önce öde, sonra işletme oluştur" akışı.
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, name, stripe_customer_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const origin = req.headers.get("origin") || "https://www.randezy.com";
  const metadata: Record<string, string> = shop ? { shop_id: String(shop.id) } : { owner_id: user.id };
  // Başarı: işletmesi olan → dashboard, olmayan → işletme formu (ödeme sonrası kurulum).
  // İptal: işletmesi olan → dashboard, olmayan → /pro (forma hiç girmesin, baştan denesin).
  const successPath = shop ? "/dashboard" : "/isletme-ekle";
  const cancelPath = shop ? "/dashboard" : "/pro";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // Mevcut Stripe müşterisi varsa onu kullan, yoksa e-postayla yeni oluşsun
      ...(shop?.stripe_customer_id
        ? { customer: shop.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: shop ? String(shop.id) : user.id,
      metadata,
      subscription_data: { metadata },
      locale: "tr",
      // Stripe'ın kendi "Promosyon kodu ekle" alanı — RANDEZY2026 gibi
      // kampanya kodları burada girilir, indirim varsa kart bile istenmez.
      allow_promotion_codes: true,
      payment_method_collection: "if_required",
      success_url: `${origin}${successPath}?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}?billing=cancel`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/checkout] error:", err);
    return NextResponse.json({ ok: false, reason: "stripe_error" }, { status: 500 });
  }
}
