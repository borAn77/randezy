import { supabase } from '../lib/supabase';
import { Appointment, AppointmentStatus } from '../types/appointment';
import { DEFAULT_DURATION } from '../constants/layout';

let cachedShopId: number | null = null;
let cachedServiceMap: Record<string, number> = {};

async function getShopContext(): Promise<{ shopId: number; serviceMap: Record<string, number> }> {
  if (cachedShopId !== null) return { shopId: cachedShopId, serviceMap: cachedServiceMap };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Giriş yapılmamış');

  const { data: shops, error: shopErr } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', session.user.id)
    .limit(1);

  if (shopErr) throw shopErr;
  if (!shops?.length) throw new Error('İşletme bulunamadı');

  const shopId = shops[0].id;

  const { data: services } = await supabase
    .from('services')
    .select('name, duration')
    .eq('shop_id', shopId);

  const serviceMap: Record<string, number> = {};
  (services || []).forEach((s: any) => { serviceMap[s.name] = s.duration; });

  cachedShopId = shopId;
  cachedServiceMap = serviceMap;

  return { shopId, serviceMap };
}

export function clearShopCache() {
  cachedShopId = null;
  cachedServiceMap = {};
}

function withDuration(apts: any[], serviceMap: Record<string, number>): Appointment[] {
  return (apts || []).map(a => ({
    ...a,
    duration_minutes: serviceMap[a.service_name] ?? DEFAULT_DURATION,
  }));
}

export async function fetchDayAppointments(date: string): Promise<Appointment[]> {
  const { shopId, serviceMap } = await getShopContext();

  const { data, error } = await supabase
    .from('appointments')
    .select('*, profiles(full_name, phone, email)')
    .eq('shop_id', shopId)
    .eq('appointment_date', date)
    .order('appointment_time', { ascending: true });

  if (error) throw error;
  return withDuration(data, serviceMap);
}

export async function fetchWeekAppointments(weekStart: string, weekEnd: string): Promise<Appointment[]> {
  const { shopId, serviceMap } = await getShopContext();

  const { data, error } = await supabase
    .from('appointments')
    .select('*, profiles(full_name, phone, email)')
    .eq('shop_id', shopId)
    .gte('appointment_date', weekStart)
    .lte('appointment_date', weekEnd)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (error) throw error;
  return withDuration(data, serviceMap);
}

export async function updateStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function reschedule(id: string, date: string, time: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ appointment_date: date, appointment_time: time })
    .eq('id', id);
  if (error) throw error;
}
