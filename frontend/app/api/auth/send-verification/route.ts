import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: dbError } = await supabaseAdmin
    .from("profiles")
    .update({ email_otp: otp, email_otp_expires_at: expiresAt })
    .eq("id", user.id);

  if (dbError) {
    console.error("[send-verification]", dbError);
    return NextResponse.json({ detail: "db_error" }, { status: 500 });
  }

  const { error: emailError } = await resend.emails.send({
    from: "Randezy <noreply@randezy.com>",
    to: [user.email!],
    subject: "E-posta Doğrulaması – Randezy",
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#00A3AD;letter-spacing:-1px">randezy</h2>
  <p>E-posta adresinizi doğrulamak için aşağıdaki kodu girin:</p>
  <div style="background:#F0FAFB;border:2px solid #00A3AD;border-radius:16px;padding:28px;text-align:center;margin:24px 0">
    <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00A3AD">${otp}</span>
  </div>
  <p style="color:#666;font-size:13px">Bu kod <b>15 dakika</b> geçerlidir. Kodu kimseyle paylaşmayın.</p>
  <p style="color:#999;font-size:12px">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
  <p>İyi günler,<br><b>Randezy Ekibi</b></p>
</div>`,
  });

  if (emailError) {
    console.error("[send-verification] email:", emailError);
    return NextResponse.json({ detail: "email_error" }, { status: 500 });
  }

  return NextResponse.json({ status: "sent" });
}
