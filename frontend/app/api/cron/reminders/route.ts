import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ ok: false, reason: "RESEND_API_KEY not configured" });
  }

  // Calculate tomorrow in Istanbul timezone (UTC+3)
  const now = new Date();
  const istanbulOffset = 3 * 60 * 60 * 1000;
  const istanbulNow = new Date(now.getTime() + istanbulOffset);
  const tomorrow = new Date(istanbulNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("*, profiles(full_name, email), shops(name)")
    .eq("appointment_date", tomorrowStr)
    .eq("status", "Onaylandı");

  if (error) {
    console.error("[cron/reminders] query error:", error);
    return NextResponse.json({ ok: false, reason: error.message });
  }

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  for (const apt of appointments) {
    const email = apt.profiles?.email;
    if (!email) continue;

    const customerName = apt.profiles?.full_name || "Müşteri";
    const shopName = apt.shops?.name || "İşletme";
    const time = apt.appointment_time?.slice(0, 5) ?? "";
    const dateStr = formatDate(tomorrowStr);

    try {
      await resend.emails.send({
        from: "Randezy <bildirim@randezy.com>",
        to: email,
        subject: `Yarın randevunuz var — ${shopName}`,
        html: reminderTemplate({ customerName, shopName, serviceName: apt.service_name, dateStr, time }),
      });
      sent++;
    } catch (err) {
      console.error("[cron/reminders] send error for", email, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

function formatDate(dateStr: string): string {
  const months = [
    "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
    "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
  ];
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

function reminderTemplate(opts: {
  customerName: string;
  shopName: string;
  serviceName: string;
  dateStr: string;
  time: string;
}): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#00A3AD;padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:13px;font-weight:900;color:rgba(255,255,255,0.7);letter-spacing:4px;text-transform:uppercase">RANDEZY</p>
            <h1 style="margin:12px 0 0;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">Randevunuzu Unutmayın!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px">
            <p style="font-size:15px;color:#333;margin:0 0 24px">Merhaba <b>${opts.customerName}</b>, yarın bir randevunuz var.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px">
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>İşletme:</b> ${opts.shopName}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>Hizmet:</b> ${opts.serviceName}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>Tarih:</b> ${opts.dateStr}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333"><b>Saat:</b> ${opts.time}</td></tr>
            </table>
            <p style="font-size:13px;color:#888;margin:24px 0 28px;line-height:1.6">Randevunuzu iptal etmek isterseniz hesabınızdan yapabilirsiniz.</p>
            <a href="https://randezy.com/hesabim" style="display:inline-block;background:#00A3AD;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase">Randevularım</a>
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
