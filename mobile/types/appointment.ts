export type AppointmentStatus =
  | 'Beklemede'
  | 'Onaylandı'
  | 'İptal Edildi'
  | 'Tamamlandı'
  | 'Gelmedi';

export interface Appointment {
  id: string;
  user_id?: string;
  shop_id: number;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  service_name: string;
  price: number;
  staff_id?: string | null;
  cancel_reason?: string | null;
  created_at?: string;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  duration_minutes: number;
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
}
