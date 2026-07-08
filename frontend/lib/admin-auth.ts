import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Admin API'lerinin ortak yetki katmanı.
// ADMIN_EMAILS env (virgülle ayrılmış); tanımsızsa kimse erişemez.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder"
);

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  const email = user?.email?.toLowerCase();
  if (!user || !email || !adminEmails().includes(email)) return null;
  return user;
}
