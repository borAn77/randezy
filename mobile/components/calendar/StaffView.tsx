import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, Image,
} from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import AppointmentCard from './AppointmentCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import { Appointment } from '../../types/appointment';
import { BRAND } from '../../constants/colors';
import { TOTAL_HEIGHT, minutesFromDayStart } from '../../utils/time';
import { TIME_AXIS_WIDTH, PIXELS_PER_MINUTE, START_HOUR } from '../../constants/layout';
import { isSameDay } from '../../utils/date';

interface LayoutItem { apt: Appointment; col: number; cols: number }

function layoutForStaff(apts: Appointment[]): LayoutItem[] {
  if (!apts.length) return [];
  const placed: LayoutItem[] = [];
  for (const apt of apts) {
    const start = minutesFromDayStart(apt.appointment_time);
    const end = start + apt.duration_minutes;
    const taken = new Set<number>();
    for (const p of placed) {
      const pS = minutesFromDayStart(p.apt.appointment_time);
      if (start < pS + p.apt.duration_minutes && end > pS) taken.add(p.col);
    }
    let col = 0; while (taken.has(col)) col++;
    placed.push({ apt, col, cols: 1 });
  }
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    const aS = minutesFromDayStart(a.apt.appointment_time), aE = aS + a.apt.duration_minutes;
    let maxCol = a.col;
    for (let j = 0; j < placed.length; j++) {
      if (i === j) continue;
      const b = placed[j];
      const bS = minutesFromDayStart(b.apt.appointment_time);
      if (aS < bS + b.apt.duration_minutes && aE > bS) maxCol = Math.max(maxCol, b.col);
    }
    placed[i].cols = maxCol + 1;
  }
  return placed;
}

const TIME_W = 40;
const HOUR_COUNT = 14; // 08-22

interface Props { onPressAppointment: (apt: Appointment) => void }

export default function StaffView({ onPressAppointment }: Props) {
  const { appointments, staff } = useAppointments();
  const { width } = useWindowDimensions();
  const { selectedDate } = useAppointments();
  const isToday = isSameDay(selectedDate, new Date());

  if (staff.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={styles.emptyTitle}>Çalışan bulunamadı</Text>
        <Text style={styles.emptySub}>İşletme panelinden çalışan ekleyebilirsiniz.</Text>
      </View>
    );
  }

  const colW = Math.max(120, (width - TIME_W - 16) / Math.min(staff.length, 4));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View>
          {/* Staff header row */}
          <View style={[styles.headerRow, { paddingLeft: TIME_W + 8 }]}>
            {staff.map(s => (
              <View key={s.id} style={[styles.staffHeader, { width: colW }]}>
                <View style={styles.staffAvatar}>
                  {s.avatar_url
                    ? <Image source={{ uri: s.avatar_url }} style={styles.staffAvatarImg} />
                    : <Text style={styles.staffInitial}>
                        {s.first_name[0]}{s.last_name[0]}
                      </Text>
                  }
                </View>
                <Text style={styles.staffName} numberOfLines={1}>
                  {s.first_name}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
            {/* Time axis */}
            <View style={{ width: TIME_W, position: 'relative', height: TOTAL_HEIGHT }}>
              {Array.from({ length: HOUR_COUNT }, (_, i) => (
                <Text
                  key={i}
                  style={[styles.hourLabel, { top: i * 60 * PIXELS_PER_MINUTE - 6 }]}
                >
                  {String(START_HOUR + i).padStart(2, '0')}:00
                </Text>
              ))}
            </View>

            {/* Staff columns */}
            {staff.map(s => {
              const staffApts = appointments.filter(a => a.staff_id === s.id);
              const items = layoutForStaff(staffApts);
              return (
                <View
                  key={s.id}
                  style={[styles.staffCol, { width: colW, height: TOTAL_HEIGHT }]}
                >
                  {/* Hour lines */}
                  {Array.from({ length: HOUR_COUNT + 1 }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.hourLine, { top: i * 60 * PIXELS_PER_MINUTE }]}
                    />
                  ))}
                  {/* Half-hour dashed */}
                  {Array.from({ length: HOUR_COUNT }, (_, i) => (
                    <View
                      key={`h${i}`}
                      style={[styles.halfLine, { top: (i * 60 + 30) * PIXELS_PER_MINUTE }]}
                    />
                  ))}

                  {isToday && <CurrentTimeIndicator />}

                  {items.map(({ apt, col, cols }) => (
                    <AppointmentCard
                      key={apt.id}
                      apt={apt} col={col} cols={cols}
                      totalWidth={colW - 4}
                      onPress={onPressAppointment}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
  },
  staffHeader: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  staffAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  staffInitial: { fontSize: 12, fontWeight: '700', color: BRAND },
  staffName: { fontSize: 11, fontWeight: '600', color: '#334155', maxWidth: '100%' },
  staffCol: {
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: '#e8ecf0',
    backgroundColor: '#fff',
  },
  hourLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 9.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  hourLine: {
    position: 'absolute',
    left: 0, right: 0, height: 1,
    backgroundColor: '#e8ecf0',
  },
  halfLine: {
    position: 'absolute',
    left: 8, right: 0, height: 1,
    backgroundColor: '#f0f4f8',
    borderStyle: 'dashed',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
