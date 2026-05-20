"use client";

import { supabase } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Core fetch wrappers ───────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { headers: await authHeaders() });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, public body: { detail?: string }) {
    super(body.detail ?? `HTTP ${status}`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "business_owner";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export interface CurrentUser {
  supabase_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  opening_hours: OpeningHour[] | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BusinessDetail extends Business {
  services: Service[];
  staff: StaffMember[];
  photos: BusinessPhoto[];
}

export interface OpeningHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
}

export interface StaffMember {
  id: string;
  business_id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface BusinessPhoto {
  id: string;
  url: string;
  position: number;
}

export interface Appointment {
  id: string;
  customer_id: string;
  business_id: string;
  staff_id: string | null;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  business?: Business;
  service?: Service;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface PaginatedBusinesses {
  items: Business[];
  total: number;
  page: number;
  page_size: number;
}

// ── API methods ───────────────────────────────────────────────────────────────

export const api = {
  // User
  me: () => get<CurrentUser>("/auth/me"),
  updateMe: (data: { full_name?: string; phone?: string }) => patch<CurrentUser>("/auth/me", data),
  myBusinesses: () => get<Business[]>("/me/businesses"),

  // Businesses — discovery
  searchBusinesses: (params: {
    city?: string;
    category?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }) => get<PaginatedBusinesses>("/businesses", params),

  getBusiness: (identifier: string) => get<BusinessDetail>(`/businesses/${identifier}`),

  getAvailability: (params: {
    business_id: string;
    service_id: string;
    date: string;           // YYYY-MM-DD
    staff_id?: string;
  }) =>
    get<TimeSlot[]>(
      `/businesses/${params.business_id}/availability`,
      { service_id: params.service_id, date: params.date, staff_id: params.staff_id }
    ),

  // Businesses — owner
  createBusiness: (data: Partial<Business>) => post<Business>("/businesses", data),
  updateBusiness: (id: string, data: Partial<Business>) => patch<Business>(`/businesses/${id}`, data),
  addService: (businessId: string, data: Omit<Service, "id" | "business_id" | "is_active">) =>
    post<Service>(`/businesses/${businessId}/services`, data),
  listServices: (businessId: string) => get<Service[]>(`/businesses/${businessId}/services`),
  addStaff: (
    businessId: string,
    data: { name: string; role?: string; photo_url?: string; service_ids?: string[] }
  ) => post<StaffMember>(`/businesses/${businessId}/staff`, data),
  businessAppointments: (businessId: string) =>
    get<Appointment[]>(`/businesses/${businessId}/appointments`),

  // Appointments
  createAppointment: (data: {
    business_id: string;
    service_id: string;
    start_time: string;
    staff_id?: string;
    notes?: string;
  }) => post<Appointment>("/appointments", data),

  myAppointments: (status?: "upcoming" | "past") =>
    get<Appointment[]>("/me/appointments", status ? { status } : undefined),

  cancelAppointment: (id: string) => patch<Appointment>(`/appointments/${id}/cancel`),
};
