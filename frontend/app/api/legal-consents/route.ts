import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  try {
    const { data } = await supabaseAdmin
      .from("legal_consents")
      .select("document_key")
      .eq("user_id", user.id);

    const keys = new Set(data?.map(row => row.document_key) || []);
    const requiredKeys = ['kullanici_sozlesmesi_v1', 'kvkk_v1', 'yurtdisi_aktarim_v1'];
    const hasRequired = requiredKeys.every(k => keys.has(k));

    return NextResponse.json({ ok: true, hasRequired, keys: Array.from(keys) });
  } catch (error: any) {
    console.error("[legal-consents GET] error:", error);
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  // Token'dan user'ı doğrula — user_id asla body'den alınmaz
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: { documents?: string[]; marketing_consent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const ALLOWED_KEYS = new Set([
    'kullanici_sozlesmesi_v1',
    'kvkk_v1',
    'yurtdisi_aktarim_v1',
    'ticari_ileti_v1',
  ]);

  const { documents = [], marketing_consent = false } = body;
  if (!Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_documents" }, { status: 400 });
  }
  const invalid = documents.filter((d: string) => !ALLOWED_KEYS.has(d));
  if (invalid.length > 0) {
    return NextResponse.json({ ok: false, reason: "invalid_document_key", keys: invalid }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") || null;
  // İspat yükümlülüğü: onay anındaki IP — server-side, proxy'nin ilettiği ilk adres
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  const records = documents.map((doc: string) => ({
    user_id:           user.id,
    document_key:      doc,
    document_version:  "2026-06-01",
    marketing_consent: doc === "ticari_ileti_v1" ? marketing_consent : false,
    user_agent:        userAgent,
    ip_address:        ipAddress,
  }));

  const { error } = await supabaseAdmin.from("legal_consents").insert(records);
  if (error) {
    console.error("[legal-consents] insert error:", error);
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: records.length });
}
