import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Misafir randevu iptali — guest_token ile, şifresiz.
// Token bilgisi = yetki: sadece randevu sahibine gösterilen/gönderilen linkte bulunur.
// Kayıtlı kullanıcı iptal akışıyla (randevularim) parite: yalnız status güncellenir,
// bildirim tetiklenmez.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// IP başına best-effort rate limit
const ipHits = new Map<string, number[]>();
function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= 20) { ipHits.set(ip, hits); return true; }
  hits.push(now);
  if (ipHits.size > 5000) ipHits.clear();
  ipHits.set(ip, hits);
  return false;
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ detail: "config_error" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (ipLimited(ip)) {
    return NextResponse.json({ detail: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin." }, { status: 429 });
  }

  let body: { token?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ detail: "invalid_body" }, { status: 400 });
  }

  const token = String(body?.token ?? "");
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ detail: "Geçersiz takip linki." }, { status: 400 });
  }

  const { data: apt } = await supabaseAdmin
    .from("appointments")
    .select("id, status, appointment_date")
    .eq("guest_token", token)
    .maybeSingle();

  if (!apt) {
    return NextResponse.json({ detail: "Randevu bulunamadı." }, { status: 404 });
  }
  if (apt.status !== "Beklemede" && apt.status !== "Onaylandı") {
    return NextResponse.json({ detail: "Bu randevu zaten iptal edilmiş veya tamamlanmış." }, { status: 409 });
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (apt.appointment_date < todayStr) {
    return NextResponse.json({ detail: "Geçmiş tarihli randevu iptal edilemez." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "İptal Edildi" })
    .eq("id", apt.id);

  if (error) {
    console.error("[guest-cancel] update error:", error);
    return NextResponse.json({ detail: "İptal edilemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
