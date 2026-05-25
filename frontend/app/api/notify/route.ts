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

  const body = await req.json();
  const { type, appointmentId } = body;

  if (type === "new_appointment" && !appointmentId) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  if (appointmentId) {
    const { data: apt } = await supabaseAdmin
      .from("appointments")
      .select("user_id, shop_id")
      .eq("id", appointmentId)
      .single();
    if (!apt) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    const isCustomer = apt.user_id === user.id;
    const { data: shopRow } = await supabaseAdmin
      .from("shops")
      .select("owner_id")
      .eq("id", apt.shop_id)
      .single();
    const isOwner = shopRow?.owner_id === user.id;
    if (!isCustomer && !isOwner) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
  }

  console.log("[notify] type:", type, "| body keys:", Object.keys(body).join(","));

  try {
    if (type === "new_appointment") {
      await handleNewAppointment(appointmentId);
    } else if (type === "appointment_confirmed") {
      await handleStatusChange(body, "confirmed");
    } else if (type === "appointment_rejected") {
      await handleStatusChange(body, "rejected");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify] error:", err);
    return NextResponse.json({ ok: false });
  }
}

async function sendExpoPush(token: string, title: string, body: string, data?: object) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, data, sound: "default" }),
    });
  } catch (e) {
    console.log("[push] expo send failed:", e);
  }
}

async function handleNewAppointment(appointmentId: string) {
  const { data: apt } = await supabaseAdmin
    .from("appointments")
    .select("shop_id, user_id, customer_name, service_name, appointment_date, appointment_time, price")
    .eq("id", appointmentId)
    .single();
  if (!apt) { console.log("[notify] appointment not found:", appointmentId); return; }

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("owner_id")
    .eq("id", apt.shop_id)
    .single();
  const ownerId = shop?.owner_id;
  if (!ownerId) { console.log("[notify] no owner_id for shop:", apt.shop_id); return; }

  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name, expo_push_token")
    .eq("id", ownerId)
    .single();

  let ownerEmail = ownerProfile?.email;
  console.log("[notify] ownerProfile email:", ownerEmail ?? "null", "| push token:", ownerProfile?.expo_push_token ? "yes" : "no");
  if (!ownerEmail) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ownerId);
    ownerEmail = authUser?.user?.email;
    console.log("[notify] auth fallback email:", ownerEmail ?? "null");
  }

  if (!ownerEmail && !ownerProfile?.expo_push_token) { console.log("[notify] no contact info, aborting"); return; }

  const customerName = apt.customer_name || "Müşteri";
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
        `<b>Müşteri:</b> ${customerName}`,
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

async function handleStatusChange(
  body: {
    customerEmail?: string;
    customerName: string;
    shopName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId?: string;
    reason?: string;
  },
  status: "confirmed" | "rejected"
) {
  let email = body.customerEmail;

  // profiles join null döndüyse appointment'tan auth.users üzerinden email al
  if (!email && body.appointmentId) {
    const { data: apt } = await supabaseAdmin
      .from("appointments")
      .select("user_id")
      .eq("id", body.appointmentId)
      .single();
    if (apt?.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(apt.user_id);
      email = authUser?.user?.email;
    }
  }

  console.log("[notify] customer email:", email ?? "null");
  if (!email) { console.log("[notify] no customer email, aborting"); return; }

  const dateStr = formatDate(body.appointmentDate);
  const isConfirmed = status === "confirmed";

  await resend!.emails.send({
    from: "Randezy <bildirim@randezy.com>",
    to: email,
    subject: isConfirmed
      ? `Randevunuz Onaylandı — ${body.shopName}`
      : `Randevunuz İptal Edildi — ${body.shopName}`,
    html: emailTemplate({
      title: isConfirmed ? "Randevunuz Onaylandı!" : "Randevunuz İptal Edildi",
      color: isConfirmed ? "#00A3AD" : "#ef4444",
      lines: [
        `<b>İşletme:</b> ${body.shopName}`,
        `<b>Hizmet:</b> ${body.serviceName}`,
        `<b>Tarih:</b> ${dateStr}`,
        `<b>Saat:</b> ${body.appointmentTime}`,
        ...(body.reason ? [`<b>Sebep:</b> ${body.reason}`] : []),
      ],
      note: isConfirmed
        ? "Randevunuzu iptal etmek isterseniz hesabınızdan yapabilirsiniz."
        : "Yeni bir randevu almak için sitemizi ziyaret edebilirsiniz.",
      ctaText: isConfirmed ? "Randevularım" : "Yeni Randevu Al",
      ctaUrl: "https://randezy.com/hesabim",
    }),
  });
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
