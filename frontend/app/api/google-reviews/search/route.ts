import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/admin-auth";
import { searchGooglePlaces } from "../../../../lib/google-places";

// İşletme sahibi kendi Google Maps kaydını bulmak için arar.
// Hiçbir şey kaydetmez — sadece aday listesi döner, sahibi doğrusunu seçer.
export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query || "").trim();
  if (query.length < 2) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const results = await searchGooglePlaces(query);
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("[google-reviews/search] error:", err);
    return NextResponse.json({ ok: false, reason: "search_failed", detail: err.message }, { status: 500 });
  }
}
