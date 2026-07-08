import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin, adminEmails } from "../../../../lib/admin-auth";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Yeni işletme kaydı (approval_status='pending') oluşunca adminlere e-posta
// gönderir. İşletme formu gönderiminden hemen sonra çağrılır (bkz. isletme-ekle).
// Bildirim gönderilemezse sessizce başarısız olur — kayıt akışını bloklamaz.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const shopId = parseInt(body.shopId, 10);
  if (!Number.isFinite(shopId)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, name, category, city, district, owner_id, profiles(full_name, email, phone)")
    .eq("id", shopId)
    .maybeSingle();
  // Sadece kaydı yapan kişi kendi işletmesi için bildirim tetikleyebilir.
  if (!shop || shop.owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const recipients = adminEmails();
  if (!resend || recipients.length === 0) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const owner = (shop as any).profiles;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0c0c0d">Yeni işletme onay bekliyor</h2>
      <p style="color:#333;line-height:1.6">
        <strong>${shop.name}</strong> (${shop.category || "-"}) — ${[shop.district, shop.city].filter(Boolean).join(", ") || "-"}<br/>
        Başvuran: ${owner?.full_name || "-"} · ${owner?.email || "-"}${owner?.phone ? " · " + owner.phone : ""}
      </p>
      <a href="https://www.randezy.com/admin" style="display:inline-block;background:#14b8a6;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:8px">Onay Merkezine Git</a>
    </div>`;
  const subject = `Yeni işletme başvurusu: ${shop.name}`;

  const { error } = await resend.emails.send({
    from: "Randezy <bildirim@randezy.com>",
    to: recipients,
    subject,
    html,
  });

  if (error) {
    console.error(`[admin/notify-new-shop] shop ${shopId} için e-posta gönderilemedi:`, error);
    return NextResponse.json({ ok: false, reason: "send_failed", detail: error.message }, { status: 500 });
  }

  console.log(`[admin/notify-new-shop] shop ${shopId} için ${recipients.length} admine bildirim gönderildi`);
  return NextResponse.json({ ok: true, sentTo: recipients });
}
