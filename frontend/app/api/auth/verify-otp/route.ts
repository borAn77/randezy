import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ detail: "unauthorized" }, { status: 401 });

  let otp: string;
  try {
    const body = await req.json();
    otp = body.otp?.trim();
  } catch {
    return NextResponse.json({ detail: "invalid_body" }, { status: 400 });
  }

  if (!otp) return NextResponse.json({ detail: "Kod gerekli." }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email_otp, email_otp_expires_at")
    .eq("id", user.id)
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

  await supabaseAdmin
    .from("profiles")
    .update({ email_verified: true, email_otp: null, email_otp_expires_at: null })
    .eq("id", user.id);

  return NextResponse.json({ status: "verified" });
}
