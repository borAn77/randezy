import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { getWeekDays, toDateStr, isSameDay, getDayShortTR } from '../../utils/date';
import { STATUS_CONFIG, BRAND } from '../../constants/colors';
import { Appointment } from '../../types/appointment';
import { formatTime } from '../../utils/time';

export default function WeekView({ onPressAppointment }: { onPressAppointment: (apt: Appointment) => void }) {
  const { selectedDate, setSelectedDate, setViewMode, weekAppointments, loading, refresh } = useAppointments();
  const week = getWeekDays(selectedDate);
  const today = new Date();

  const aptsByDate: Record<string, Appointment[]> = {};
  weekAppointments.forEach(a => {
    if (!aptsByDate[a.appointment_date]) aptsByDate[a.appointment_date] = [];
    aptsByDate[a.appointment_date].push(a);
  });

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={BRAND} />}
    >
      {loading && weekAppointments.length === 0 && (
        <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
      )}
      {week.map(day => {
        const dateStr = toDateStr(day);
        const apts = aptsByDate[dateStr] || [];
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);

        return (
          <TouchableOpacity
            key={dateStr}
            onPress={() => goToDay(day)}
            style={[styles.dayRow, isSelected && styles.dayRowSelected]}
            activeOpacity={0.7}
          >
            {/* Day header */}
            <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
              <Text style={[styles.dayShort, isToday && styles.todayText]}>
                {getDayShortTR(day)}
              </Text>
              <Text style={[styles.dayNum, isToday && styles.todayText]}>
                {day.getDate()}
              </Text>
              {apts.length > 0 && (
                <View style={[styles.badge, isToday && styles.badgeToday]}>
                  <Text style={[styles.badgeText, isToday && styles.badgeTextToday]}>
                    {apts.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Appointments */}
            <View style={styles.aptList}>
              {apts.length === 0 ? (
                <Text style={styles.noApt}>—</Text>
              ) : (
                apts.slice(0, 3).map(apt => {
                  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
                  return (
                    <TouchableOpacity
                      key={apt.id}
                      onPress={() => onPressAppointment(apt)}
                      style={[styles.aptChip, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}
                    >
                      <Text style={[styles.aptChipTime, { color: cfg.text }]}>
                        {formatTime(apt.appointment_time)}
                      </Text>
                      <Text style={[styles.aptChipName, { color: cfg.text }]} numberOfLines={1}>
                        {apt.profiles?.full_name || 'Misafir'} · {apt.service_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              {apts.length > 3 && (
                <Text style={styles.more}>+{apts.length - 3} daha</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  dayRowSelected: { backgroundColor: '#f8faff' },
  dayHeader: {
    width: 44,
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  dayHeaderToday: {},
  dayShort: { fontSize: 10, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  dayNum: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  todayText: { color: BRAND },
  badge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeToday: { backgroundColor: BRAND },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  badgeTextToday: { color: '#fff' },
  aptList: { flex: 1, gap: 4 },
  noApt: { color: '#cbd5e1', fontSize: 13, paddingVertical: 4 },
  aptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  aptChipTime: { fontSize: 11, fontWeight: '700', minWidth: 36 },
  aptChipName: { fontSize: 11, flex: 1 },
  more: { fontSize: 11, color: '#94a3b8', paddingLeft: 8 },
});
