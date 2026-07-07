import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "../../../../lib/admin-auth";

// Promo kod yönetimi — sadece ADMIN_EMAILS.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("promo_codes")
    .select("id, code, description, duration_days, max_uses, used_count, is_active, expires_at, created_at, promo_redemptions(shop_id, redeemed_at, shops(name))")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin/promos] list error:", error);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, promos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  let code = String(body.code || "").trim().toUpperCase();
  if (!code) {
    // Kod verilmediyse üret: RNDZ-XXXX (karışan karakterler yok)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    code = "RNDZ-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  const duration_days = parseInt(body.duration_days, 10);
  const max_uses = body.max_uses != null && body.max_uses !== "" ? parseInt(body.max_uses, 10) : null;
  const expires_at = body.expires_at || null;
  const description = String(body.description || "").trim() || null;

  if (!/^[A-Z0-9-]{4,24}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "invalid_code" }, { status: 400 });
  }
  if (!Number.isFinite(duration_days) || duration_days < 1 || duration_days > 730) {
    return NextResponse.json({ ok: false, reason: "invalid_duration" }, { status: 400 });
  }
  if (max_uses != null && (!Number.isFinite(max_uses) || max_uses < 1)) {
    return NextResponse.json({ ok: false, reason: "invalid_max_uses" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("promo_codes")
    .insert({ code, description, duration_days, max_uses, expires_at })
    .select()
    .single();
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json(
      { ok: false, reason: dup ? "duplicate_code" : "db_error" },
      { status: dup ? 409 : 500 }
    );
  }

  console.log(`[admin/promos] ${admin.email} kod üretti: ${code} (${duration_days}g)`);
  return NextResponse.json({ ok: true, promo: data });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = parseInt(body.id, 10);
  if (!Number.isFinite(id) || typeof body.is_active !== "boolean") {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("promo_codes")
    .update({ is_active: body.is_active })
    .eq("id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });

  console.log(`[admin/promos] ${admin.email} kod ${id} → is_active=${body.is_active}`);
  return NextResponse.json({ ok: true });
}
