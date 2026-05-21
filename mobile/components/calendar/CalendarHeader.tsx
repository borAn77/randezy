import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { formatDateTR, addDays } from '../../utils/date';
import { BRAND } from '../../constants/colors';

interface Props {
  onOpenDatePicker: () => void;
}

export default function CalendarHeader({ onOpenDatePicker }: Props) {
  const { viewMode, setViewMode, selectedDate, setSelectedDate } = useAppointments();

  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? -1 : -7));
  const goNext = () => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : 7));

  const isToday = new Date().toDateString() === selectedDate.toDateString();

  return (
    <View style={styles.container}>
      {/* Row 1: title + today */}
      <View style={styles.row}>
        <TouchableOpacity onPress={onOpenDatePicker} style={styles.titleBtn}>
          <Text style={styles.title}>{formatDateTR(selectedDate)}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={goToday} style={styles.todayBtn}>
            <Text style={styles.todayText}>Bugün</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: prev/next + view toggle */}
      <View style={styles.row}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggle}>
          {(['day', 'week'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[styles.toggleBtn, viewMode === m && styles.toggleActive]}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  chevron: { fontSize: 14, color: '#94a3b8', marginTop: 1 },
  todayBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  todayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 36, height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 22, color: '#475569', lineHeight: 26 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  toggleActiveText: { color: '#1e293b' },
});
