import { createClient } from "@supabase/supabase-js";

// Personel kod-giriş sisteminin ortak parçaları.
// Kod = kimlik (guest_token deseni): staff_access_codes anon'a kapalı olduğu
// için tüm doğrulama service_role ile server'da yapılır.

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

// Kodu toleranslı normalize et: küçük harf / boşluk / eksik tire kabul edilir
export function normalizeStaffCode(raw: unknown): string | null {
  const stripped = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^RDZ[A-Z2-9]{8}$/.test(stripped)) return null;
  return `RDZ-${stripped.slice(3, 7)}-${stripped.slice(7)}`;
}

// IP başına best-effort rate limit (instance-local)
const ipHits = new Map<string, number[]>();
export function staffRateLimited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) { ipHits.set(ip, hits); return true; }
  hits.push(now);
  if (ipHits.size > 5000) ipHits.clear();
  ipHits.set(ip, hits);
  return false;
}

export type StaffIdentity = {
  staffId: string;
  shopId: number;
  staffName: string;
  shopName: string;
};

type StaffJoinRow = {
  staff_id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    shop_id: number;
    shops: { name: string } | null;
  } | null;
};

// Kodu doğrula → personel kimliği (yoksa null)
export async function resolveStaffByCode(rawCode: unknown): Promise<StaffIdentity | null> {
  const code = normalizeStaffCode(rawCode);
  if (!code) return null;
  const { data } = await supabaseAdmin
    .from("staff_access_codes")
    .select("staff_id, staff(id, first_name, last_name, shop_id, shops(name))")
    .eq("code", code)
    .maybeSingle();
  const row = data as StaffJoinRow | null;
  if (!row?.staff) return null;
  return {
    staffId: row.staff_id,
    shopId: row.staff.shop_id,
    staffName: `${row.staff.first_name} ${row.staff.last_name}`.trim(),
    shopName: row.staff.shops?.name ?? "İşletme",
  };
}
