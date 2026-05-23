import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Appointment, AppointmentStatus, StaffMember } from '../types/appointment';
import {
  fetchDayAppointments, fetchWeekAppointments, fetchRangeAppointments, fetchStaff,
  updateStatus, reschedule, deleteAppointment, clearShopCache,
} from '../services/appointments';
import { toDateStr, getWeekDays, getMonthStart, getMonthEnd, addDays } from '../utils/date';

// gun=Day, hafta=Week, ay=Month, calisan=Staff-columns, liste=Agenda-list
export type ViewMode = 'gun' | 'hafta' | 'ay' | 'calisan' | 'liste';

export interface DailyStats {
  total: number; confirmed: number; pending: number;
  cancelled: number; noShow: number; occupancyPct: number;
}

interface AppointmentsCtx {
  viewMode: ViewMode; setViewMode: (m: ViewMode) => void;
  selectedDate: Date; setSelectedDate: (d: Date) => void;
  selectedStaffId: string | null; setSelectedStaffId: (id: string | null) => void;
  appointments: Appointment[];       // single-day (gun / calisan)
  rangeAppointments: Appointment[];  // week / month / list range
  staff: StaffMember[];
  stats: DailyStats;
  loading: boolean; error: string | null;
  refresh: () => void;
  doUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  doReschedule: (id: string, date: string, time: string) => Promise<void>;
  doDelete: (id: string) => Promise<void>;
}

const Ctx = createContext<AppointmentsCtx | null>(null);

function calcStats(apts: Appointment[]): DailyStats {
  const total = apts.length;
  const confirmed = apts.filter(a => a.status === 'Onaylandı').length;
  const pending = apts.filter(a => a.status === 'Beklemede').length;
  const cancelled = apts.filter(a => a.status === 'İptal Edildi').length;
  const noShow = apts.filter(a => a.status === 'Gelmedi').length;
  const totalMinutes = 14 * 60;
  const usedMinutes = apts
    .filter(a => a.status === 'Onaylandı' || a.status === 'Tamamlandı')
    .reduce((s, a) => s + a.duration_minutes, 0);
  const occupancyPct = Math.min(100, Math.round(usedMinutes / totalMinutes * 100));
  return { total, confirmed, pending, cancelled, noShow, occupancyPct };
}

export function AppointmentsProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('gun');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rangeAppointments, setRangeAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);

  const load = useCallback(async (date: Date) => {
    setLoading(true); setError(null);
    const t = ++token.current;
    try {
      const [staffData] = await Promise.all([fetchStaff()]);
      if (t === token.current) setStaff(staffData);

      if (viewMode === 'gun' || viewMode === 'calisan') {
        const data = await fetchDayAppointments(toDateStr(date));
        if (t === token.current) setAppointments(data);
      } else if (viewMode === 'hafta') {
        const week = getWeekDays(date);
        const data = await fetchWeekAppointments(toDateStr(week[0]), toDateStr(week[6]));
        if (t === token.current) setRangeAppointments(data);
      } else if (viewMode === 'ay') {
        const start = getMonthStart(date);
        const end = getMonthEnd(date);
        const data = await fetchRangeAppointments(toDateStr(start), toDateStr(end));
        if (t === token.current) setRangeAppointments(data);
      } else if (viewMode === 'liste') {
        const data = await fetchRangeAppointments(toDateStr(date), toDateStr(addDays(date, 6)));
        if (t === token.current) setRangeAppointments(data);
      }
    } catch (e: any) {
      if (t === token.current) setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      if (t === token.current) setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => { load(selectedDate); }, [selectedDate, viewMode, load]);

  const refresh = useCallback(() => { clearShopCache(); load(selectedDate); }, [load, selectedDate]);

  const visibleApts = selectedStaffId
    ? appointments.filter(a => a.staff_id === selectedStaffId)
    : appointments;

  const stats = calcStats(visibleApts);

  const doUpdateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    const apt = appointments.find(a => a.id === id) ?? rangeAppointments.find(a => a.id === id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setRangeAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await updateStatus(id, status, apt);
  }, [appointments, rangeAppointments]);

  const doReschedule = useCallback(async (id: string, date: string, time: string) => {
    await reschedule(id, date, time); refresh();
  }, [refresh]);

  const doDelete = useCallback(async (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    setRangeAppointments(prev => prev.filter(a => a.id !== id));
    await deleteAppointment(id);
  }, []);

  return (
    <Ctx.Provider value={{
      viewMode, setViewMode,
      selectedDate, setSelectedDate,
      selectedStaffId, setSelectedStaffId,
      appointments: visibleApts, rangeAppointments,
      staff, stats, loading, error, refresh,
      doUpdateStatus, doReschedule, doDelete,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppointments must be inside AppointmentsProvider');
  return ctx;
}
