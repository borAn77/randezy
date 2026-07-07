import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";

// "Hemen Başla" akışında, işletme HENÜZ oluşmadan önce promo kod kullanımı.
// Stripe'a hiç uğramaz — kod geçerliyse gerçekten 0 TL, kart bilgisi istenmez.
// Süre profiles.pending_subscription_until'a yazılır; işletme formu
// gönderilince /api/billing/attach-pending bu kaydı yeni işletmeye taşır.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "invalid_code" }, { status: 400 });
  }

  const { data: promo } = await supabaseAdmin
    .from("promo_codes")
    .select("id, code, duration_days, max_uses, used_count, is_active, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!promo || !promo.is_active) {
    return NextResponse.json({ ok: false, reason: "invalid_code" }, { status: 404 });
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, reason: "expired_code" }, { status: 410 });
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ ok: false, reason: "exhausted" }, { status: 410 });
  }

  const newUntil = new Date(Date.now() + promo.duration_days * 86400000).toISOString();

  const { error: redemptionErr } = await supabaseAdmin
    .from("promo_redemptions")
    .insert({ promo_code_id: promo.id, owner_id: user.id, granted_until: newUntil });
  if (redemptionErr) {
    const already = redemptionErr.code === "23505";
    return NextResponse.json(
      { ok: false, reason: already ? "already_used" : "db_error" },
      { status: already ? 409 : 500 }
    );
  }

  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      pending_subscription_until: newUntil,
      pending_stripe_customer_id: null,
      pending_stripe_subscription_id: null,
    })
    .eq("id", user.id);
  if (profileErr) {
    console.error("[promo/redeem-pending] profile update error:", profileErr);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  await supabaseAdmin
    .from("promo_codes")
    .update({ used_count: promo.used_count + 1 })
    .eq("id", promo.id);

  console.log(`[promo/redeem-pending] owner ${user.id} → ${code} (+${promo.duration_days}g, until ${newUntil})`);
  return NextResponse.json({ ok: true, subscription_until: newUntil, duration_days: promo.duration_days });
}
