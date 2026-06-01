import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
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
    return NextResponse.json({ ok: false, reason: "config_error: RESEND_API_KEY missing" }, { status: 500 });
  }

  const now = new Date();

  // 24h window: randevular now+22h ile now+26h arası
  const win24hStart = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const win24hEnd   = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  // 3h window: randevular now+2h ile now+4h arası
  const win3hStart  = new Date(now.getTime() +  2 * 60 * 60 * 1000);
  const win3hEnd    = new Date(now.getTime() +  4 * 60 * 60 * 1000);

  // Pencereye giren en erken ve en geç tarihleri hesapla (YYYY-MM-DD)
  const dateRange = uniqueDates([win24hStart, win24hEnd, win3hStart, win3hEnd]);

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, appointment_time, service_name, status, reminder_24h_sent_at, reminder_3h_sent_at, profiles(full_name, email), shops(name)")
    .in("appointment_date", dateRange)
    .eq("status", "Onaylandı");

  if (error) {
    console.error("[cron/reminders] query error:", error);
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  let sent_24h = 0;
  let sent_3h  = 0;
  let skipped_no_email = 0;
  let failed   = 0;

  for (const apt of appointments ?? []) {
    const profile = Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles;
    const shop2   = Array.isArray(apt.shops)    ? apt.shops[0]    : apt.shops;

    const email = (profile as any)?.email;
    if (!email) { skipped_no_email++; continue; }

    const timeStr = apt.appointment_time?.slice(0, 5) ?? "09:00";
    const aptDatetime = new Date(`${apt.appointment_date}T${timeStr}:00+03:00`);

    const customerName = (profile as any)?.full_name || "Müşteri";
    const shopName     = (shop2 as any)?.name || "İşletme";
    const dateLabel    = formatDate(apt.appointment_date);

    // 24h reminder
    if (
      !apt.reminder_24h_sent_at &&
      aptDatetime >= win24hStart &&
      aptDatetime <= win24hEnd
    ) {
      try {
        await resend.emails.send({
          from: "Randezy <bildirim@randezy.com>",
          to: email,
          subject: `Yarın randevunuz var — ${shopName}`,
          html: reminderTemplate({
            customerName,
            shopName,
            serviceName: apt.service_name ?? "Hizmet",
            dateStr: dateLabel,
            time: timeStr,
            type: "24h",
          }),
        });
        await supabaseAdmin
          .from("appointments")
          .update({ reminder_24h_sent_at: new Date().toISOString() })
          .eq("id", apt.id);
        sent_24h++;
      } catch (err) {
        console.error("[cron/reminders] 24h send error", apt.id, err);
        failed++;
      }
    }

    // 3h reminder
    if (
      !apt.reminder_3h_sent_at &&
      aptDatetime >= win3hStart &&
      aptDatetime <= win3hEnd
    ) {
      try {
        await resend.emails.send({
          from: "Randezy <bildirim@randezy.com>",
          to: email,
          subject: `Randevunuz 3 saat sonra — ${shopName}`,
          html: reminderTemplate({
            customerName,
            shopName,
            serviceName: apt.service_name ?? "Hizmet",
            dateStr: dateLabel,
            time: timeStr,
            type: "3h",
          }),
        });
        await supabaseAdmin
          .from("appointments")
          .update({ reminder_3h_sent_at: new Date().toISOString() })
          .eq("id", apt.id);
        sent_3h++;
      } catch (err) {
        console.error("[cron/reminders] 3h send error", apt.id, err);
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent_24h, sent_3h, skipped_no_email, failed });
}

// Penceredeki unique YYYY-MM-DD tarih listesi
function uniqueDates(dates: Date[]): string[] {
  const set = new Set<string>();
  dates.forEach(d => set.add(d.toISOString().split("T")[0]));
  return Array.from(set);
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
  type: "24h" | "3h";
}): string {
  const intro = opts.type === "24h"
    ? `Yarın bir randevunuz var.`
    : `Randevunuz yaklaşıyor, hazır mısınız?`;

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
            <p style="font-size:15px;color:#333;margin:0 0 24px">Merhaba <b>${opts.customerName}</b>, ${intro}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px">
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>İşletme:</b> ${opts.shopName}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>Hizmet:</b> ${opts.serviceName}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #eee"><b>Tarih:</b> ${opts.dateStr}</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#333"><b>Saat:</b> ${opts.time}</td></tr>
            </table>
            <p style="font-size:13px;color:#888;margin:24px 0 28px;line-height:1.6">Randevunuzu görüntülemek veya iptal etmek için Randevularım sayfasına gidebilirsiniz.</p>
            <a href="https://randezy.com/randevularim" style="display:inline-block;background:#00A3AD;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase">Randevularım</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;font-size:11px;color:#bbb">© 2026 Randezy · <a href="https://randezy.com" style="color:#bbb">randezy.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
