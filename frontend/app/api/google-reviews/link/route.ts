import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { fetchGooglePlaceDetails } from "../../../../lib/google-places";

// Sahibi bir Google adayını onaylayınca: place_id'yi kaydeder + hemen ilk
// senkronu yapar (puan, yorum sayısı, en fazla 5 yorum — API'nin kısıtı).
export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const placeId = String(body.placeId || "").trim();
  if (!placeId) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!shop) return NextResponse.json({ ok: false, reason: "no_shop" }, { status: 404 });

  try {
    const details = await fetchGooglePlaceDetails(placeId);
    const { error } = await supabaseAdmin
      .from("shops")
      .update({
        google_place_id: placeId,
        google_rating: details.rating,
        google_review_count: details.review_count,
        google_reviews: details.reviews,
        google_reviews_synced_at: new Date().toISOString(),
      })
      .eq("id", shop.id);
    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json(
        { ok: false, reason: dup ? "already_linked_elsewhere" : "db_error" },
        { status: dup ? 409 : 500 }
      );
    }
    console.log(`[google-reviews/link] shop ${shop.id} → ${placeId} bağlandı, ${details.reviews.length} yorum çekildi`);
    return NextResponse.json({ ok: true, ...details });
  } catch (err: any) {
    console.error("[google-reviews/link] error:", err);
    return NextResponse.json({ ok: false, reason: "sync_failed", detail: err.message }, { status: 500 });
  }
}

// Bağlantıyı kaldır
export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!shop) return NextResponse.json({ ok: false, reason: "no_shop" }, { status: 404 });

  await supabaseAdmin
    .from("shops")
    .update({
      google_place_id: null,
      google_rating: null,
      google_review_count: null,
      google_reviews: null,
      google_reviews_synced_at: null,
    })
    .eq("id", shop.id);

  return NextResponse.json({ ok: true });
}
