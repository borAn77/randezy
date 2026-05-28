import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "config_error" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const now = new Date();
  const istanbulNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const today = istanbulNow.toISOString().split("T")[0];

  try {
    // Step 2: Owner mı?
    const { data: ownerShops, error: shopsQueryError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("owner_id", userId);

    if (shopsQueryError) {
      console.error("[delete-account] step:owner_check failed:", shopsQueryError);
      return NextResponse.json({ ok: false, reason: "step_failed:owner_check" }, { status: 500 });
    }

    if (ownerShops && ownerShops.length > 0) {
      const shopIds = ownerShops.map((s: any) => s.id);

      // Step 3: Aktif gelecek randevu varsa engelle
      const { count, error: countError } = await supabaseAdmin
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .in("shop_id", shopIds)
        .gte("appointment_date", today)
        .in("status", ["Beklemede", "Onaylandı"]);

      if (countError) {
        console.error("[delete-account] step:active_check failed:", countError);
        return NextResponse.json({ ok: false, reason: "step_failed:active_check" }, { status: 500 });
      }

      if (count && count > 0) {
        return NextResponse.json({ ok: false, reason: "active_appointments" }, { status: 409 });
      }

      // Step 4: Shop'a bağlı appointments sil (FK NO ACTION → önce silinmeli)
      const { error: shopAptsError } = await supabaseAdmin
        .from("appointments")
        .delete()
        .in("shop_id", shopIds);

      if (shopAptsError) {
        console.error("[delete-account] step:shop_appointments_delete failed:", shopAptsError);
        return NextResponse.json({ ok: false, reason: "step_failed:shop_appointments_delete" }, { status: 500 });
      }

      // Step 5: Shops sil → CASCADE: services, staff, shop_hours, campaigns, reviews
      const { error: shopsDeleteError } = await supabaseAdmin
        .from("shops")
        .delete()
        .eq("owner_id", userId);

      if (shopsDeleteError) {
        console.error("[delete-account] step:shops_delete failed:", shopsDeleteError);
        return NextResponse.json({ ok: false, reason: "step_failed:shops_delete" }, { status: 500 });
      }
    }

    // Step 6: Kendi gelecek aktif randevularını iptal et
    const { error: cancelError } = await supabaseAdmin
      .from("appointments")
      .update({ status: "İptal Edildi", cancel_reason: "Kullanıcı hesabını sildi" })
      .eq("user_id", userId)
      .gte("appointment_date", today)
      .in("status", ["Beklemede", "Onaylandı"]);

    if (cancelError) {
      console.error("[delete-account] step:cancel_future failed:", cancelError);
      return NextResponse.json({ ok: false, reason: "step_failed:cancel_future" }, { status: 500 });
    }

    // Step 7: Kendi tüm appointment kayıtlarını anonymize et
    const { error: anonError } = await supabaseAdmin
      .from("appointments")
      .update({ user_id: null, customer_name: "Silinmiş kullanıcı", customer_phone: null })
      .eq("user_id", userId);

    if (anonError) {
      console.error("[delete-account] step:anonymize failed:", anonError);
      return NextResponse.json({ ok: false, reason: "step_failed:anonymize" }, { status: 500 });
    }

    // Step 8: Profiles sil → CASCADE: reviews (user_id → profiles)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("[delete-account] step:profiles_delete failed:", profileError);
      return NextResponse.json({ ok: false, reason: "step_failed:profiles_delete" }, { status: 500 });
    }

    // Step 9: Auth user sil EN SON → CASCADE: favorites (user_id → auth.users)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("[delete-account] step:auth_delete failed:", authDeleteError);
      return NextResponse.json({ ok: false, reason: "step_failed:auth_delete" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[delete-account] unexpected error:", err);
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
