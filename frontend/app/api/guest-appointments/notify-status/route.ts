import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";

// Misafir randevularında onay/iptal durum değişikliğinde bildirim.
// Email birincil kanal (Netgsm başlık onayı alınana kadar SMS best-effort/no-op).
// /api/notify sadece user_id'li (kayıtlı) müşteriler için email atıyor ve
// CLAUDE.md gereği o dosyaya dokunulmuyor — bu route misafir tarafını kapatır.

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

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

  const body = await req.json().catch(() => null);
  const appointmentId = body?.appointmentId;
  const status = body?.status;
  if (!appointmentId || (status !== "confirmed" && status !== "rejected")) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { data: apt } = await supabaseAdmin
    .from("appointments")
    .select("user_id, shop_id, guest_name, guest_phone, guest_email, guest_token, service_name, appointment_date, appointment_time")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!apt) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  if (apt.user_id || (!apt.guest_phone && !apt.guest_email)) {
    // Kayıtlı müşteri değil, sadece misafir randevuları burada işlenir.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: shopRow } = await supabaseAdmin
    .from("shops")
    .select("owner_id, name")
    .eq("id", apt.shop_id)
    .maybeSingle();
  if (shopRow?.owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const dateStr = formatDate(apt.appointment_date);
  const timeStr = apt.appointment_time?.slice(0, 5);
  const guestName = apt.guest_name || "Müşteri";
  const shopName = shopRow?.name || "";
  const reason = body?.reason ? String(body.reason).trim().slice(0, 200) : "";
  const isConfirmed = status === "confirmed";

  let emailSent = false;
  if (apt.guest_email && resend) {
    try {
      await resend.emails.send({
        from: "Randezy <bildirim@randezy.com>",
        to: apt.guest_email,
        subject: isConfirmed
          ? `Randevunuz Onaylandı — ${shopName}`
          : `Randevunuz İptal Edildi — ${shopName}`,
        html: emailTemplate({
          title: isConfirmed ? "Randevunuz Onaylandı!" : "Randevunuz İptal Edildi",
          color: isConfirmed ? "#00A3AD" : "#ef4444",
          lines: [
            `<b>İşletme:</b> ${shopName}`,
            `<b>Hizmet:</b> ${apt.service_name}`,
            `<b>Tarih:</b> ${dateStr}`,
            `<b>Saat:</b> ${timeStr}`,
            ...(reason ? [`<b>Sebep:</b> ${reason}`] : []),
          ],
          note: isConfirmed
            ? "Randevunuzu takip linkinden görüntüleyebilir ve gerekirse iptal edebilirsiniz."
            : "Yeni bir randevu almak için işletmenin sayfasını ziyaret edebilirsiniz.",
          ctaText: "Randevumu Görüntüle",
          ctaUrl: apt.guest_token ? `https://randezy.com/randevu/${apt.guest_token}` : "https://randezy.com",
        }),
      });
      emailSent = true;
    } catch (e) {
      console.error("[guest-appointments/notify-status] email failed:", e);
    }
  }

  let smsSent = false;
  if (apt.guest_phone) {
    const msg = isConfirmed
      ? `Sayın ${guestName}, ${shopName} - ${apt.service_name} - ${dateStr} ${timeStr} randevunuz onaylandı.`
      : `Sayın ${guestName}, ${shopName} - ${apt.service_name} - ${dateStr} ${timeStr} randevunuz iptal edildi.${reason ? ` Sebep: ${reason}` : ""}`;
    smsSent = await sendSms(apt.guest_phone, msg);
  }

  return NextResponse.json({ ok: emailSent || smsSent });
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
