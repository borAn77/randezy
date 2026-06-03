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

    // 1. Bu userId için profil var mı? (trigger veya önceki kayıt)
    const { data: byId } = await supabaseAdmin
      .from("profiles").select("id").eq("id", userId).maybeSingle();

    if (byId) {
      // Doğru profil mevcut — sadece OTP güncelle
      await supabaseAdmin.from("profiles")
        .update({ email_otp: otp, email_otp_expires_at: expiresAt, email_verified: false })
        .eq("id", userId);
    } else {
      // 2. Bu email'e ait başka bir profil var mı? (önceki doğrulanmamış kayıt)
      const { data: byEmail } = await supabaseAdmin
        .from("profiles").select("id").eq("email", userEmail).maybeSingle();

      if (byEmail) {
        // Eski profil mevcut — o profilin gerçek userId'sini kullan
        userId = byEmail.id;
        await supabaseAdmin.from("profiles")
          .update({ email_otp: otp, email_otp_expires_at: expiresAt, email_verified: false })
          .eq("id", userId);
      } else {
        // 3. Hiç profil yok — yeni INSERT
        const { error: insErr } = await supabaseAdmin.from("profiles").insert({
          id: userId, email: userEmail, email_verified: false,
          email_otp: otp, email_otp_expires_at: expiresAt,
        });

        if (insErr?.code === "23503") {
          // FK hatası: Supabase sahte userId döndürdü (email zaten kayıtlı ama doğrulanmamış)
          // Admin API ile gerçek userId'yi bul
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const realUser = users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
          if (!realUser) {
            return NextResponse.json({ detail: "Bu e-posta zaten kayıtlı. Lütfen giriş yapın." }, { status: 400 });
          }
          userId = realUser.id;
          await supabaseAdmin.from("profiles").upsert(
            { id: userId, email: userEmail, email_verified: false, email_otp: otp, email_otp_expires_at: expiresAt },
            { onConflict: "id" }
          );
        } else if (insErr) {
          console.error("[send-verification] insert:", insErr.code, insErr.message);
          return NextResponse.json({ detail: `insert_error: ${insErr.code} – ${insErr.message}` }, { status: 500 });
        }
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
