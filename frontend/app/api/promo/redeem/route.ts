import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";

// İşletme sahibi promo kod kullanır → shops.subscription_until uzar.
// Kod doğrulaması ve yazma işlemleri service_role ile yapılır;
// promo_codes tablosu istemciden okunamaz (RLS kilitli).
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "invalid_code" }, { status: 400 });
  }

  // Kullanıcının işletmesi
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, subscription_until")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!shop) {
    return NextResponse.json({ ok: false, reason: "no_shop" }, { status: 404 });
  }

  // Kod geçerli mi?
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

  // Süre: mevcut bitişin (veya şimdinin) üzerine eklenir
  const base = Math.max(Date.now(), new Date(shop.subscription_until).getTime());
  const newUntil = new Date(base + promo.duration_days * 86400000).toISOString();

  // Aynı kod aynı işletmede bir kez — unique constraint son sözü söyler
  const { error: redemptionErr } = await supabaseAdmin
    .from("promo_redemptions")
    .insert({ promo_code_id: promo.id, shop_id: shop.id, granted_until: newUntil });
  if (redemptionErr) {
    const already = redemptionErr.code === "23505";
    return NextResponse.json(
      { ok: false, reason: already ? "already_used" : "db_error" },
      { status: already ? 409 : 500 }
    );
  }

  const { error: shopErr } = await supabaseAdmin
    .from("shops")
    .update({ subscription_until: newUntil })
    .eq("id", shop.id);
  if (shopErr) {
    console.error("[promo/redeem] shop update error:", shopErr);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  await supabaseAdmin
    .from("promo_codes")
    .update({ used_count: promo.used_count + 1 })
    .eq("id", promo.id);

  console.log(`[promo/redeem] shop ${shop.id} → ${code} (+${promo.duration_days}g, until ${newUntil})`);
  return NextResponse.json({ ok: true, subscription_until: newUntil, duration_days: promo.duration_days });
}
