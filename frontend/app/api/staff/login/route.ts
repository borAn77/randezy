import { NextRequest, NextResponse } from "next/server";
import { normalizeStaffCode, resolveStaffByCode, staffRateLimited } from "../shared";

// Personel giriş kodu doğrulama — başarıda personel adı + işletme adı döner.
// Kod client'ta saklanır ve her takvim isteğinde yeniden doğrulanır;
// owner kodu yenilediği an eski kod tüm isteklerde geçersizleşir.

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ detail: "config_error" }, { status: 500 });
  }

  // Brute-force koruması: IP başına 15 dakikada 10 deneme
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (staffRateLimited(ip, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ detail: "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin." }, { status: 429 });
  }

  let body: { code?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ detail: "invalid_body" }, { status: 400 });
  }

  if (!normalizeStaffCode(body?.code)) {
    return NextResponse.json({ detail: "Geçersiz kod formatı. Örnek: RDZ-7K2M-9QX4" }, { status: 400 });
  }

  const identity = await resolveStaffByCode(body.code);
  if (!identity) {
    return NextResponse.json({ detail: "Kod geçersiz veya yenilenmiş. İşletme sahibinden güncel kodu isteyin." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, staff: { name: identity.staffName, shopName: identity.shopName } });
}
