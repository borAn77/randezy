import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import GuestTicket, { type TicketData } from "./GuestTicket";

// Misafir randevu takip sayfası — şifresiz, guest_token ile erişilir.
// RLS anon okumaya kapalı olduğu için veri SERVER tarafında service_role ile çekilir;
// key client'a asla inmez. Token bilgisi = erişim yetkisi (link sadece randevu
// sahibine gösterilir/gönderilir).

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchAppointment(token: string) {
  if (!UUID_RE.test(token) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabaseAdmin
    .from("appointments")
    .select("service_name, appointment_date, appointment_time, price, status, guest_name, duration_snapshot, staff(first_name, last_name), shops(name, city, district, street)")
    .eq("guest_token", token)
    .maybeSingle();
  return data;
}

function NotFound() {
  return (
    <main className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-2xl font-black tracking-tighter text-[#0c0c0d] mb-3">randezy</p>
      <h1 className="text-lg font-black uppercase tracking-tight text-[#0c0c0d] mb-2">Randevu Bulunamadı</h1>
      <p className="text-[12px] text-gray-400 font-medium max-w-xs leading-relaxed mb-8">
        Bu takip linki geçersiz veya randevu silinmiş olabilir. Linki e-postandan eksiksiz kopyaladığından emin ol.
      </p>
      <Link href="/" className="bg-[#0c0c0d] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#14b8a6] transition-all">
        Ana Sayfa
      </Link>
    </main>
  );
}

type AptRow = {
  service_name: string;
  appointment_date: string;
  appointment_time: string | null;
  price: number | null;
  status: string;
  guest_name: string | null;
  duration_snapshot: number | null;
  staff: { first_name: string; last_name: string } | null;
  shops: { name: string; city: string; district: string; street: string } | null;
};

export default async function GuestAppointmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const apt = (await fetchAppointment(token)) as AptRow | null;
  if (!apt) return <NotFound />;

  const ticket: TicketData = {
    token,
    serviceName: apt.service_name,
    date: apt.appointment_date,
    time: apt.appointment_time?.slice(0, 5) ?? "--:--",
    price: apt.price ?? 0,
    status: apt.status,
    guestName: apt.guest_name,
    duration: apt.duration_snapshot ?? null,
    staffName: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}`.trim() : null,
    shopName: apt.shops?.name ?? "İşletme",
    shopLocation: [apt.shops?.district, apt.shops?.city].filter(Boolean).join(", "),
  };

  return <GuestTicket ticket={ticket} />;
}
