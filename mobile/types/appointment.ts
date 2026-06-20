export type AppointmentStatus =
  | 'Beklemede'
  | 'Onaylandı'
  | 'İptal Edildi'
  | 'Tamamlandı'
  | 'Gelmedi';

export interface ServiceItem {
  id: number;
  name: string;
  price: number;
  duration: number;
}

export interface CreateAppointmentParams {
  guestName: string;
  guestPhone?: string;
  serviceName: string;
  price: number;
  duration: number;
  appointmentDate: string;
  appointmentTime: string;
  staffId?: string | null;
}

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
  guest_name?: string | null;
  guest_phone?: string | null;
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
