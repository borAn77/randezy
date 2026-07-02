import { NextRequest, NextResponse } from "next/server";
import { resolveStaffByCode, staffRateLimited, supabaseAdmin } from "../shared";

// Personel günlük takvimi — KATI KAPSAM:
//   ✓ Sadece kodun sahibi personele atanmış randevular (staff_id eşleşmesi)
//   ✓ O günün çalışma saatleri
//   ✗ Fiyat/ciro YOK, diğer personellerin randevuları YOK, dükkan ayarları YOK,
//     müşteri telefonu/e-postası YOK — müşteri sadece görünen adıyla döner.

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ detail: "config_error" }, { status: 500 });
  }

  // Polling 30sn'de bir → limit login'den geniş: IP başına dakikada 30 istek
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (staffRateLimited(ip, 30, 60 * 1000)) {
    return NextResponse.json({ detail: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  let body: { code?: unknown; date?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ detail: "invalid_body" }, { status: 400 });
  }

  const date = String(body?.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ detail: "Geçersiz tarih." }, { status: 400 });
  }

  const identity = await resolveStaffByCode(body?.code);
  if (!identity) {
    // Kod yenilenmiş/silinmiş — client bu durumda giriş ekranına döner
    return NextResponse.json({ detail: "Kod geçersiz veya yenilenmiş." }, { status: 401 });
  }

  const [aptsRes, hoursRes] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("id, appointment_time, duration_snapshot, service_name, status, customer_name, guest_name")
      .eq("shop_id", identity.shopId)
      .eq("staff_id", identity.staffId)
      .eq("appointment_date", date)
      .order("appointment_time", { ascending: true }),
    supabaseAdmin
      .from("shop_hours")
      .select("open_time, close_time")
      .eq("shop_id", identity.shopId)
      .eq("day_of_week", new Date(`${date}T12:00:00`).getDay())
      .maybeSingle(),
  ]);

  // Kapsam dışı alanları server'da ele: sadece görünen ad gönder
  type AptRow = { id: string; appointment_time: string | null; duration_snapshot: number | null; service_name: string; status: string; customer_name: string | null; guest_name: string | null };
  const appointments = ((aptsRes.data || []) as AptRow[]).map((a) => ({
    id: a.id,
    time: a.appointment_time?.slice(0, 5) ?? "--:--",
    duration: a.duration_snapshot ?? 30,
    serviceName: a.service_name,
    status: a.status,
    customerName: (a.customer_name || a.guest_name || "Müşteri").trim(),
  }));

  return NextResponse.json({
    ok: true,
    staffName: identity.staffName,
    shopName: identity.shopName,
    hours: hoursRes.data ? { open: hoursRes.data.open_time?.slice(0, 5), close: hoursRes.data.close_time?.slice(0, 5) } : null,
    appointments,
  });
}
