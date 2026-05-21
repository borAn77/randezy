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
  appointment_date: string;   // YYYY-MM-DD
  appointment_time: string;   // HH:MM or HH:MM:SS
  status: AppointmentStatus;
  service_name: string;
  price: number;
  staff_id?: string | null;
  cancel_reason?: string | null;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  duration_minutes: number;
}
