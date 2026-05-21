import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { formatDateTR, addDays, toDateStr } from '../../utils/date';
import { BRAND } from '../../constants/colors';

interface Props {
  onOpenDatePicker: () => void;
}

export default function CalendarHeader({ onOpenDatePicker }: Props) {
  const { viewMode, setViewMode, selectedDate, setSelectedDate, appointments, weekAppointments } = useAppointments();

  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? -1 : -7));
  const goNext = () => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : 7));

  const isToday = toDateStr(new Date()) === toDateStr(selectedDate);
  const count = viewMode === 'day' ? appointments.length : weekAppointments.length;

  return (
    <View style={styles.container}>
      {/* Top row: date title + today button */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onOpenDatePicker} style={styles.dateBtn} activeOpacity={0.7}>
          <Text style={styles.dateText}>{formatDateTR(selectedDate)}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={goToday} style={styles.todayPill}>
            <Text style={styles.todayPillText}>Bugün</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom row: nav arrows + count + toggle */}
      <View style={styles.bottomRow}>
        <View style={styles.navGroup}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
          {count > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{count} randevu</Text>
            </View>
          )}
        </View>

        <View style={styles.toggle}>
          {(['day', 'week'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[styles.toggleBtn, viewMode === m && styles.toggleActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, viewMode === m && styles.toggleActiveText]}>
                {m === 'day' ? 'Gün' : 'Hafta'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 19, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  chevron: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  todayPill: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: {
    width: 38, height: 38,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 24, color: '#334155', lineHeight: 28 },
  countPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 4,
  },
  countText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10 },
  toggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  toggleActiveText: { color: '#1e293b', fontWeight: '700' },
});
