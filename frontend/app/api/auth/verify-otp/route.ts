import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

export async function POST(req: NextRequest) {
  let userId: string;

  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ detail: "invalid_body" }, { status: 400 }); }

  const otp = body?.otp?.trim();
  if (!otp) return NextResponse.json({ detail: "Kod gerekli." }, { status: 400 });

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });
    userId = user.id;
  } else {
    if (!body?.email) return NextResponse.json({ detail: "email required" }, { status: 400 });
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", body.email)
      .single();
    if (!profile) return NextResponse.json({ detail: "user not found" }, { status: 404 });
    userId = profile.id;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email_otp, email_otp_expires_at")
    .eq("id", userId)
    .single();

  if (!profile?.email_otp) {
    return NextResponse.json({ detail: "Doğrulama kodu bulunamadı. Yeni kod isteyin." }, { status: 400 });
  }

  if (new Date() > new Date(profile.email_otp_expires_at)) {
    return NextResponse.json({ detail: "Doğrulama kodunun süresi dolmuş. Yeni kod isteyin." }, { status: 400 });
  }

  if (profile.email_otp !== otp) {
    return NextResponse.json({ detail: "Doğrulama kodu hatalı." }, { status: 400 });
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({ email_verified: true, email_otp: null, email_otp_expires_at: null })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error("[verify-otp] profile update:", profileUpdateError);
    return NextResponse.json({ detail: "Doğrulama kaydedilemedi." }, { status: 500 });
  }

  // Supabase auth tarafında da email'i onayla
  const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmError) {
    console.error("[verify-otp] updateUserById:", confirmError);
    // Profil güncellendi ama auth onayı başarısız — yine de devam et
  }

  return NextResponse.json({ status: "verified" });
}
