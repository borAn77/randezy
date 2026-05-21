import React, { useCallback, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl,
  Text, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Appointment } from '../../types/appointment';
import { useAppointments } from '../../contexts/AppointmentsContext';
import TimeAxis from './TimeAxis';
import AppointmentCard from './AppointmentCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import { TOTAL_HEIGHT, minutesFromDayStart } from '../../utils/time';
import {
  TIME_AXIS_WIDTH, PIXELS_PER_MINUTE, START_HOUR,
} from '../../constants/layout';
import { isSameDay } from '../../utils/date';
import { BRAND } from '../../constants/colors';

interface LayoutItem {
  apt: Appointment;
  col: number;
  cols: number;
}

function layoutAppointments(appointments: Appointment[]): LayoutItem[] {
  if (!appointments.length) return [];

  const placed: LayoutItem[] = [];

  for (const apt of appointments) {
    const start = minutesFromDayStart(apt.appointment_time);
    const end = start + apt.duration_minutes;

    const taken = new Set<number>();
    for (const p of placed) {
      const pStart = minutesFromDayStart(p.apt.appointment_time);
      const pEnd = pStart + p.apt.duration_minutes;
      if (start < pEnd && end > pStart) taken.add(p.col);
    }

    let col = 0;
    while (taken.has(col)) col++;
    placed.push({ apt, col, cols: 1 });
  }

  // Recalculate cols for each overlapping group
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    const aStart = minutesFromDayStart(a.apt.appointment_time);
    const aEnd = aStart + a.apt.duration_minutes;
    let maxCol = a.col;

    for (let j = 0; j < placed.length; j++) {
      if (i === j) continue;
      const b = placed[j];
      const bStart = minutesFromDayStart(b.apt.appointment_time);
      const bEnd = bStart + b.apt.duration_minutes;
      if (aStart < bEnd && aEnd > bStart) {
        maxCol = Math.max(maxCol, b.col);
      }
    }

    placed[i].cols = maxCol + 1;
  }

  return placed;
}

interface Props {
  onPressAppointment: (apt: Appointment) => void;
}

export default function DayView({ onPressAppointment }: Props) {
  const { appointments, loading, error, refresh, selectedDate } = useAppointments();
  const { width } = useWindowDimensions();
  const gridWidth = width - TIME_AXIS_WIDTH - 16;
  const scrollRef = useRef<ScrollView>(null);

  const isToday = isSameDay(selectedDate, new Date());

  const scrollToNow = useCallback(() => {
    const now = new Date();
    const minutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
    const y = Math.max(0, minutes * PIXELS_PER_MINUTE - 100);
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  React.useEffect(() => {
    if (isToday) setTimeout(scrollToNow, 300);
  }, [isToday, scrollToNow]);

  const items = layoutAppointments(appointments);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={BRAND} />
      }
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={refresh}>Tekrar dene</Text>
        </View>
      )}

      <View style={styles.grid}>
        {/* Time axis */}
        <TimeAxis />

        {/* Appointment area */}
        <View style={[styles.aptArea, { width: gridWidth, height: TOTAL_HEIGHT }]}>
          {/* Hour lines */}
          {Array.from({ length: 14 }, (_, i) => (
            <View
              key={i}
              style={[styles.hourLine, { top: i * 60 * PIXELS_PER_MINUTE }]}
            />
          ))}
          {/* Half-hour lines */}
          {Array.from({ length: 14 }, (_, i) => (
            <View
              key={`h${i}`}
              style={[styles.halfLine, { top: (i * 60 + 30) * PIXELS_PER_MINUTE }]}
            />
          ))}

          {/* Current time */}
          {isToday && <CurrentTimeIndicator />}

          {/* Appointment cards */}
          {items.map(({ apt, col, cols }) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              col={col}
              cols={cols}
              totalWidth={gridWidth - 4}
              onPress={onPressAppointment}
            />
          ))}

          {/* Empty state */}
          {!loading && appointments.length === 0 && !error && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>Bu gün randevu yok</Text>
            </View>
          )}

          {loading && appointments.length === 0 && (
            <View style={styles.empty}>
              <ActivityIndicator color={BRAND} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingVertical: 8 },
  grid: { flexDirection: 'row', paddingHorizontal: 8 },
  aptArea: { position: 'relative' },
  hourLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  halfLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  empty: {
    position: 'absolute',
    top: 80, left: 0, right: 0,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  errorBanner: {
    backgroundColor: '#fff1f2',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#e11d48', fontSize: 13, flex: 1 },
  retryText: { color: BRAND, fontSize: 13, fontWeight: '700', marginLeft: 8 },
});
