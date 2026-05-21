import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { formatDateTR, addDays, toDateStr } from '../../utils/date';
import { BRAND, BRAND_LIGHT, STATUS_CONFIG } from '../../constants/colors';

interface Props { onOpenDatePicker: () => void }

export default function CalendarHeader({ onOpenDatePicker }: Props) {
  const {
    selectedDate, setSelectedDate, appointments,
    staff, selectedStaffId, setSelectedStaffId,
  } = useAppointments();

  const isToday = toDateStr(new Date()) === toDateStr(selectedDate);

  const pendingCount = appointments.filter(a => a.status === 'Beklemede').length;

  return (
    <View style={styles.container}>
      {/* Date navigation row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          style={styles.navBtn}
        >
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenDatePicker} style={styles.datePill} activeOpacity={0.7}>
          <Text style={styles.calIcon}>📅</Text>
          <Text style={styles.dateText}>{formatDateTR(selectedDate)}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Today + pending badges row */}
      {(!isToday || pendingCount > 0) && (
        <View style={styles.badgeRow}>
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.todayBtn}>
              <Text style={styles.todayText}>Bugün</Text>
            </TouchableOpacity>
          )}
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>● {pendingCount} bekleyen randevu</Text>
            </View>
          )}
        </View>
      )}

      {/* Staff filter */}
      {staff.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.staffScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedStaffId(null)}
            style={[styles.staffChip, selectedStaffId === null && styles.staffChipActive]}
          >
            <Text style={[styles.staffChipText, selectedStaffId === null && styles.staffChipTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          {staff.map(s => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedStaffId(selectedStaffId === s.id ? null : s.id)}
              style={[styles.staffChip, selectedStaffId === s.id && styles.staffChipActive]}
            >
              <View style={[styles.staffAvatar, selectedStaffId === s.id && styles.staffAvatarActive]}>
                {s.avatar_url
                  ? <Image source={{ uri: s.avatar_url }} style={styles.staffAvatarImg} />
                  : <Text style={[styles.staffInitial, selectedStaffId === s.id && { color: '#fff' }]}>
                      {s.first_name.charAt(0)}
                    </Text>
                }
              </View>
              <Text style={[styles.staffChipText, selectedStaffId === s.id && styles.staffChipTextActive]}>
                {s.first_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRow}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.border }]} />
            <Text style={styles.legendText}>{status}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navBtn: {
    width: 40, height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 26, color: '#334155', lineHeight: 30 },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8ecf0',
  },
  calIcon: { fontSize: 15 },
  dateText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  chevron: { fontSize: 11, color: '#94a3b8' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  todayBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  todayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pendingBadge: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pendingText: { color: '#92400e', fontSize: 11, fontWeight: '700' },
  staffScroll: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  staffChipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  staffAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarActive: { backgroundColor: BRAND },
  staffAvatarImg: { width: 22, height: 22, borderRadius: 11 },
  staffInitial: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  staffChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  staffChipTextActive: { color: BRAND, fontWeight: '700' },
  legendRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#64748b', fontWeight: '500' },
});
