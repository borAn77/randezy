import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";

// Misafir (hesapsız) randevu oluşturma.
// RLS anon insert'e bilinçli olarak kapalı — bu route service_role ile çalışır ve
// tüm doğrulama/rate-limit burada yapılır. Overlap koruması DB trigger'ında
// (fn_check_appointment_overlap) olduğu için çakışmalar 409'a çevrilir.

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

const normalizePhone = (raw: string): string | null => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12 && digits[2] === "5") return "+" + digits;
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "5") return "+90" + digits.slice(1);
  if (digits.startsWith("5") && digits.length === 10) return "+90" + digits;
  return null;
};

// IP başına best-effort rate limit (instance-local; kalıcı limit telefon üzerinden DB'de)
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX = 10;
function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX) { ipHits.set(ip, hits); return true; }
  hits.push(now);
  if (ipHits.size > 5000) ipHits.clear();
  ipHits.set(ip, hits);
  return false;
}

// Telefon başına aktif randevu tavanı (kalıcı, DB üzerinden)
const PHONE_ACTIVE_MAX = 5;

type GuestItem = { serviceId: number | string; price?: number; date: string; time: string; staffId?: string | null };

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ detail: "config_error" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (ipLimited(ip)) {
    return NextResponse.json({ detail: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin." }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ detail: "invalid_body" }, { status: 400 });
  }

  // ── Girdi doğrulama ─────────────────────────────────────────────────
  const shopId = Number(body?.shopId);
  if (!Number.isInteger(shopId) || shopId <= 0) {
    return NextResponse.json({ detail: "Geçersiz işletme." }, { status: 400 });
  }

  const name = String(body?.guest?.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60 || /^\d+$/.test(name)) {
    return NextResponse.json({ detail: "Geçerli bir ad soyad girin." }, { status: 400 });
  }

  const phone = normalizePhone(body?.guest?.phone);
  if (!phone) {
    return NextResponse.json({ detail: "Geçerli bir Türkiye cep telefonu girin. Örnek: 05321234567" }, { status: 400 });
  }

  const emailRaw = String(body?.guest?.email ?? "").trim();
  if (!emailRaw || !/^\S+@\S+\.\S+$/.test(emailRaw) || emailRaw.length > 120) {
    return NextResponse.json({ detail: "Geçerli bir e-posta girin." }, { status: 400 });
  }
  const guestEmail = emailRaw;

  // KVKK: aydınlatma + yurt dışı aktarım rızası server'da da zorunlu —
  // UI atlansa bile rızasız misafir randevusu oluşturulamaz.
  if (body?.consents?.kvkk !== true || body?.consents?.transfer !== true) {
    return NextResponse.json({ detail: "Devam etmek için zorunlu onayları işaretleyin." }, { status: 400 });
  }

  const items: GuestItem[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length < 1 || items.length > 5) {
    return NextResponse.json({ detail: "Geçersiz randevu listesi." }, { status: 400 });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  for (const it of items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it?.date ?? "") || it.date < todayStr || it.date > maxDate) {
      return NextResponse.json({ detail: "Geçersiz randevu tarihi." }, { status: 400 });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(it?.time ?? "")) {
      return NextResponse.json({ detail: "Geçersiz randevu saati." }, { status: 400 });
    }
  }

  // ── İşletme + hizmet + personel doğrulaması (DB kaynaklı) ───────────
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, name, owner_id, is_active")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop || shop.is_active === false) {
    return NextResponse.json({ detail: "İşletme bulunamadı veya aktif değil." }, { status: 404 });
  }

  const serviceIds = [...new Set(items.map((i) => i.serviceId))];
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, name, price, duration")
    .eq("shop_id", shopId)
    .in("id", serviceIds);
  const serviceMap = new Map((services || []).map((s: any) => [String(s.id), s]));
  if (serviceMap.size !== serviceIds.length) {
    return NextResponse.json({ detail: "Seçilen hizmetlerden biri bulunamadı." }, { status: 400 });
  }

  const staffIds = [...new Set(items.map((i) => i.staffId).filter(Boolean))] as string[];
  if (staffIds.length > 0) {
    const { data: staffRows } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("shop_id", shopId)
      .in("id", staffIds);
    if ((staffRows || []).length !== staffIds.length) {
      return NextResponse.json({ detail: "Seçilen personel bulunamadı." }, { status: 400 });
    }
  }

  // ── Telefon bazlı rate limit (aktif randevu tavanı) ─────────────────
  const { count: activeCount } = await supabaseAdmin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("guest_phone", phone)
    .gte("appointment_date", todayStr)
    .in("status", ["Beklemede", "Onaylandı"]);
  if ((activeCount ?? 0) + items.length > PHONE_ACTIVE_MAX) {
    return NextResponse.json(
      { detail: "Bu telefon numarasıyla çok sayıda aktif randevu var. Mevcut randevularınız tamamlandıktan sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  // ── Rıza kaydı (İSPAT — randevudan ÖNCE yazılır) ────────────────────
  // Misafirin user_id'si yok; kimlik çıpası guest_phone. Log yazılamazsa
  // randevu da alınmaz: rızası ispatlanamayan işlem yaratmayız.
  // Kutu 1 = sözleşme kabulü + aydınlatma tebliği (Tebliğ md.5/1-g gereği
  // aydınlatma ayrıca onaylatılmaz), kutu 2 = yurt dışı açık rızası.
  const consentIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const consentUa = req.headers.get("user-agent") || null;
  const { error: consentError } = await supabaseAdmin.from("legal_consents").insert(
    ["kullanici_sozlesmesi_v1", "kvkk_v1", "yurtdisi_aktarim_v1"].map((doc) => ({
      user_id: null,
      guest_phone: phone,
      document_key: doc,
      document_version: "2026-06-01",
      marketing_consent: false,
      ip_address: consentIp,
      user_agent: consentUa,
    }))
  );
  if (consentError) {
    console.error("[guest-appointments] consent log error:", consentError);
    return NextResponse.json({ detail: "Onay kaydı oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }

  // ── Insert ──────────────────────────────────────────────────────────
  // Fiyat: kampanyalı fiyat client'tan gelir (giriş yapmış akışla parite);
  // sadece 0..baz fiyat aralığına sabitlenir, aralık dışıysa baz fiyat kullanılır.
  const rows = items.map((it) => {
    const svc: any = serviceMap.get(String(it.serviceId));
    const base = Number(svc.price) || 0;
    const p = Number(it.price);
    const safePrice = Number.isFinite(p) && p >= 0 && p <= base ? Math.round(p) : base;
    return {
      user_id: null,
      shop_id: shopId,
      customer_name: name,
      guest_name: name,
      guest_phone: phone,
      guest_email: guestEmail,
      service_id: svc.id,
      service_name: svc.name,
      price: safePrice,
      appointment_date: it.date,
      appointment_time: it.time,
      status: "Beklemede",
      staff_id: it.staffId || null,
      duration_snapshot: Number(svc.duration) > 0 ? Number(svc.duration) : 30,
    };
  });

  const { data: inserted, error } = await supabaseAdmin
    .from("appointments")
    .insert(rows)
    .select("id, guest_token, service_name, appointment_date, appointment_time, price");

  if (error) {
    if (error.code === "23P01" || error.code === "23505") {
      return NextResponse.json(
        { detail: "Seçtiğiniz saatlerden biri az önce doldu. Lütfen başka bir saat seçin." },
        { status: 409 }
      );
    }
    console.error("[guest-appointments] insert error:", error);
    return NextResponse.json({ detail: "Randevu oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }

  // ── Bildirimler (booking'i asla düşürmez) ───────────────────────────
  try {
    for (const apt of inserted || []) {
      await notifyOwnerNewAppointment(shop.owner_id, name, apt);
    }
  } catch (e) { console.error("[guest-appointments] owner notify failed:", e); }

  try {
    if (guestEmail && resend && (inserted?.length ?? 0) > 0) {
      await sendGuestConfirmationEmail(guestEmail, name, shop.name, inserted!);
    }
  } catch (e) { console.error("[guest-appointments] guest email failed:", e); }

  try {
    if ((inserted?.length ?? 0) > 0) {
      await sendGuestConfirmationSms(phone, name, shop.name, inserted!);
    }
  } catch (e) { console.error("[guest-appointments] guest sms failed:", e); }

  return NextResponse.json(
    { ok: true, appointments: (inserted || []).map((a) => ({ id: a.id, guest_token: a.guest_token })) },
    { status: 201 }
  );
}

// ─────────────────────────────────────────────────────────────────────
// Aşağısı /api/notify'daki handleNewAppointment'ın birebir yansımasıdır.
// /api/notify güvenlik kontratı (auth zorunlu) korunacağı için oradan import
// edilemiyor ve o dosyaya DOKUNULMUYOR (CLAUDE.md). Oradaki şablon değişirse
// burası da güncellenmelidir.
// ─────────────────────────────────────────────────────────────────────

async function sendExpoPush(token: string, title: string, body: string, data?: object) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, data, sound: "default" }),
    });
  } catch (e) {
    console.log("[guest-appointments][push] expo send failed:", e);
  }
}

async function notifyOwnerNewAppointment(
  ownerId: string,
  customerName: string,
  apt: { service_name: string; appointment_date: string; appointment_time: string; price: number }
) {
  if (!ownerId) return;

  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name, expo_push_token")
    .eq("id", ownerId)
    .maybeSingle();

  let ownerEmail = ownerProfile?.email;
  if (!ownerEmail) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ownerId);
    ownerEmail = authUser?.user?.email;
  }
  if (!ownerEmail && !ownerProfile?.expo_push_token) return;

  const dateStr = formatDate(apt.appointment_date);

  if (ownerProfile?.expo_push_token) {
    await sendExpoPush(
      ownerProfile.expo_push_token,
      "Yeni Randevu!",
      `${customerName} — ${apt.service_name} — ${dateStr} ${apt.appointment_time?.slice(0, 5)}`,
      { type: "new_appointment" }
    );
  }

  if (!ownerEmail || !resend) return;

  await resend.emails.send({
    from: "Randezy <bildirim@randezy.com>",
    to: ownerEmail,
    subject: `Yeni Randevu — ${apt.service_name}`,
    html: emailTemplate({
      title: "Yeni Randevu Geldi!",
      color: "#00A3AD",
      lines: [
        `<b>Hizmet:</b> ${apt.service_name}`,
        `<b>Müşteri:</b> ${customerName} (Misafir)`,
        `<b>Tarih:</b> ${dateStr}`,
        `<b>Saat:</b> ${apt.appointment_time?.slice(0, 5)}`,
        `<b>Ücret:</b> ₺${apt.price}`,
      ],
      note: "Randevuyu onaylamak veya reddetmek için dashboard'ınıza giriş yapın.",
      ctaText: "Dashboard'a Git",
      ctaUrl: "https://randezy.com/dashboard",
    }),
  });
}

async function sendGuestConfirmationEmail(
  to: string,
  guestName: string,
  shopName: string,
  appointments: { guest_token: string; service_name: string; appointment_date: string; appointment_time: string; price: number }[]
) {
  const first = appointments[0];
  await resend!.emails.send({
    from: "Randezy <bildirim@randezy.com>",
    to,
    subject: `Randevu Talebiniz Alındı — ${shopName}`,
    html: emailTemplate({
      title: "Randevu Talebiniz Alındı!",
      color: "#00A3AD",
      lines: appointments.flatMap((a) => [
        `<b>Hizmet:</b> ${a.service_name}`,
        `<b>Tarih:</b> ${formatDate(a.appointment_date)} · ${a.appointment_time?.slice(0, 5)}`,
        `<b>Ücret:</b> ₺${a.price}`,
        `<b>Takip linki:</b> <a href="https://randezy.com/randevu/${a.guest_token}">randezy.com/randevu/${a.guest_token.slice(0, 8)}…</a>`,
      ]),
      note: `Merhaba ${guestName}, işletme onayladığında bilgilendirileceksiniz. Randevunuzu takip linkinden görüntüleyebilir ve gerekirse iptal edebilirsiniz.`,
      ctaText: "Randevumu Görüntüle",
      ctaUrl: `https://randezy.com/randevu/${first.guest_token}`,
    }),
  });
}

async function sendGuestConfirmationSms(
  phone: string,
  guestName: string,
  shopName: string,
  appointments: { guest_token: string; service_name: string; appointment_date: string; appointment_time: string }[]
) {
  const first = appointments[0];
  const dateStr = formatDate(first.appointment_date);
  const trackUrl = `https://randezy.com/randevu/${first.guest_token}`;
  const msg =
    appointments.length > 1
      ? `Sayın ${guestName}, ${shopName} için ${appointments.length} randevu talebiniz alındı. Onaylandığında bilgilendirileceksiniz. Takip: ${trackUrl}`
      : `Sayın ${guestName}, ${shopName} - ${first.service_name} - ${dateStr} ${first.appointment_time?.slice(0, 5)} randevu talebiniz alındı. Onaylandığında bilgilendirileceksiniz. Takip: ${trackUrl}`;
  await sendSms(phone, msg);
}

function formatDate(dateStr: string): string {
  const months = [
    "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
    "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
  ];
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

function emailTemplate(opts: {
  title: string;
  color: string;
  lines: string[];
  note: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:${opts.color};padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:13px;font-weight:900;color:rgba(255,255,255,0.7);letter-spacing:4px;text-transform:uppercase">RANDEZY</p>
            <h1 style="margin:12px 0 0;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">${opts.title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px">
              ${opts.lines.map(l => `<tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee">${l}</td></tr>`).join("")}
            </table>
            <p style="font-size:13px;color:#888;margin:24px 0 28px;line-height:1.6">${opts.note}</p>
            <a href="${opts.ctaUrl}" style="display:inline-block;background:${opts.color};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase">${opts.ctaText}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;font-size:11px;color:#bbb">© 2025 Randezy · <a href="https://randezy.com" style="color:#bbb">randezy.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
