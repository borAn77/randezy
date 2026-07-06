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

// Admin yetkisi ADMIN_EMAILS env değişkeninden okunur (virgülle ayrılmış).
// Env tanımlı değilse KİMSE erişemez — güvenli varsayılan.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  const email = user?.email?.toLowerCase();
  if (!user || !email || !adminEmails().includes(email)) return null;
  return user;
}

export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("shops")
    .select(
      "id, name, slug, category, city, district, street, shop_phone, image_url, gallery_urls, description, instagram, is_active, approval_status, created_at, owner_id, profiles(full_name, email, phone), services(id, name, price), staff(id, first_name, last_name)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/shops] list error:", error);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, shops: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { shopId, status, sendEmail } = body as {
    shopId?: number; status?: string; sendEmail?: boolean;
  };
  if (!shopId || !status || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const { data: shop, error } = await supabaseAdmin
    .from("shops")
    .update({ approval_status: status })
    .eq("id", shopId)
    .select("id, name, approval_status, profiles(full_name, email)")
    .single();

  if (error || !shop) {
    console.error("[admin/shops] update error:", error);
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  // İspat/denetim izi: kim, hangi işletmeye, ne karar verdi
  console.log(`[admin/shops] ${admin.email} → shop ${shopId} (${shop.name}): ${status}`);

  // İşletme sahibine bilgilendirme e-postası (hata olsa da karar geri alınmaz)
  const ownerEmail = (shop as any).profiles?.email as string | undefined;
  if (sendEmail !== false && resend && ownerEmail && status !== "pending") {
    try {
      if (status === "approved") {
        await resend.emails.send({
          from: "Randezy <bildirim@randezy.com>",
          to: ownerEmail,
          subject: "İşletmeniz Randezy'de yayında 🎉",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#0c0c0d">Tebrikler, başvurunuz onaylandı!</h2>
              <p style="color:#333;line-height:1.6"><strong>${shop.name}</strong> artık Randezy'de müşterilere görünüyor.
              Panelinizden hizmetlerinizi, çalışma saatlerinizi ve kampanyalarınızı yönetebilirsiniz.</p>
              <a href="https://www.randezy.com/dashboard" style="display:inline-block;background:#14b8a6;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:8px">Panele Git</a>
              <p style="color:#8a8a8e;font-size:12px;margin-top:24px">Randezy — randevu ve işletme yönetimi platformu</p>
            </div>`,
        });
      } else {
        await resend.emails.send({
          from: "Randezy <bildirim@randezy.com>",
          to: ownerEmail,
          subject: "Randezy başvurunuz hakkında",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#0c0c0d">Başvurunuz onaylanamadı</h2>
              <p style="color:#333;line-height:1.6"><strong>${shop.name}</strong> için yaptığınız başvuruda işletme doğrulaması
              tamamlanamadı. Bir yanlışlık olduğunu düşünüyorsanız bu e-postayı yanıtlayarak bize ulaşabilirsiniz.</p>
              <p style="color:#8a8a8e;font-size:12px;margin-top:24px">Randezy — randevu ve işletme yönetimi platformu</p>
            </div>`,
        });
      }
    } catch (err) {
      console.error("[admin/shops] email error:", err);
    }
  }

  return NextResponse.json({ ok: true, shop: { id: shop.id, approval_status: shop.approval_status } });
}
