import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { fetchGooglePlaceDetails } from "../../../../lib/google-places";

// Zaten bağlı olan Google kaydını yeniden çeker (dashboard'daki "Yenile" butonu).
export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, google_place_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!shop?.google_place_id) {
    return NextResponse.json({ ok: false, reason: "not_linked" }, { status: 404 });
  }

  try {
    const details = await fetchGooglePlaceDetails(shop.google_place_id);
    await supabaseAdmin
      .from("shops")
      .update({
        google_rating: details.rating,
        google_review_count: details.review_count,
        google_reviews: details.reviews,
        google_reviews_synced_at: new Date().toISOString(),
      })
      .eq("id", shop.id);
    return NextResponse.json({ ok: true, ...details });
  } catch (err: any) {
    console.error("[google-reviews/refresh] error:", err);
    return NextResponse.json({ ok: false, reason: "sync_failed", detail: err.message }, { status: 500 });
  }
}
