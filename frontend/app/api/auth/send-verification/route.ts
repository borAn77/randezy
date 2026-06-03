import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  let userId: string;
  let userEmail: string;

  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  // OTP'yi en başta oluştur — tek atomik işlem için
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (token) {
    // Oturumu olan kullanıcı
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });
    userId = user.id;
    userEmail = user.email!;

    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({ email_otp: otp, email_otp_expires_at: expiresAt })
      .eq("id", userId);

    if (dbError) {
      console.error("[send-verification] token-path db:", dbError);
      return NextResponse.json({ detail: "db_error" }, { status: 500 });
    }
  } else if (body?.userId && body?.email) {
    // Yeni kayıt — session yok, userId ve email body'den geliyor
    userId = body.userId;
    userEmail = body.email;

    // 1. Önce bu userId ile profil var mı dene — sadece OTP güncelle
    const { data: existingById } = await supabaseAdmin
      .from("profiles").select("id").eq("id", userId).maybeSingle();

    if (existingById) {
      // Profil zaten var, sadece OTP'yi güncelle
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ email_otp: otp, email_otp_expires_at: expiresAt, email_verified: false })
        .eq("id", userId);
      if (updErr) {
        console.error("[send-verification] update otp:", updErr.code, updErr.message);
        return NextResponse.json({ detail: `otp_update_error: ${updErr.message}` }, { status: 500 });
      }
    } else {
      // 2. Eski profil varsa temizle (email unique constraint çakışması önlenir)
      await supabaseAdmin.from("profiles").delete().eq("email", userEmail).neq("id", userId);

      // 3. Minimal INSERT — sadece zorunlu alanlar
      const { error: insErr } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: userEmail,
        email_verified: false,
        email_otp: otp,
        email_otp_expires_at: expiresAt,
      });
      if (insErr) {
        console.error("[send-verification] insert:", insErr.code, insErr.message);
        return NextResponse.json({ detail: `insert_error: ${insErr.code} – ${insErr.message}` }, { status: 500 });
      }
    }
  } else if (body?.email) {
    // Tekrar gönder — profil zaten var
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", body.email)
      .single();
    if (!profile) return NextResponse.json({ detail: "user not found" }, { status: 404 });
    userId = profile.id;
    userEmail = body.email;

    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({ email_otp: otp, email_otp_expires_at: expiresAt })
      .eq("id", userId);

    if (dbError) {
      console.error("[send-verification] resend-path db:", dbError);
      return NextResponse.json({ detail: "db_error" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ detail: "email required" }, { status: 400 });
  }

  const { error: emailError } = await resend.emails.send({
    from: "Randezy <noreply@randezy.com>",
    to: [userEmail],
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
