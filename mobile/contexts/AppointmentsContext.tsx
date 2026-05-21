import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Appointment, AppointmentStatus } from '../types/appointment';
import {
  fetchDayAppointments, fetchWeekAppointments,
  updateStatus, reschedule, clearShopCache,
} from '../services/appointments';
import { toDateStr, getWeekDays } from '../utils/date';

type ViewMode = 'day' | 'week';

interface AppointmentsCtx {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  appointments: Appointment[];
  weekAppointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  doUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  doReschedule: (id: string, date: string, time: string) => Promise<void>;
}

const Ctx = createContext<AppointmentsCtx | null>(null);

export function AppointmentsProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshToken = useRef(0);

  const load = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    const token = ++refreshToken.current;
    try {
      if (viewMode === 'day') {
        const data = await fetchDayAppointments(toDateStr(date));
        if (token === refreshToken.current) setAppointments(data);
      } else {
        const week = getWeekDays(date);
        const start = toDateStr(week[0]);
        const end = toDateStr(week[6]);
        const data = await fetchWeekAppointments(start, end);
        if (token === refreshToken.current) setWeekAppointments(data);
      }
    } catch (e: any) {
      if (token === refreshToken.current) setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      if (token === refreshToken.current) setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => { load(selectedDate); }, [selectedDate, viewMode, load]);

  const refresh = useCallback(() => { clearShopCache(); load(selectedDate); }, [load, selectedDate]);

  const doUpdateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setWeekAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await updateStatus(id, status);
  }, []);

  const doReschedule = useCallback(async (id: string, date: string, time: string) => {
    await reschedule(id, date, time);
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{
      viewMode, setViewMode,
      selectedDate, setSelectedDate,
      appointments, weekAppointments,
      loading, error, refresh,
      doUpdateStatus, doReschedule,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppointments must be used inside AppointmentsProvider');
  return ctx;
}
