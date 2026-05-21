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

  const totalWeek = weekAppointments.length;
  const pendingWeek = weekAppointments.filter(a => a.status === 'Beklemede').length;

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={BRAND} />}
    >
      {loading && weekAppointments.length === 0 && (
        <View style={styles.center}><ActivityIndicator color={BRAND} size="large" /></View>
      )}

      {/* Week summary */}
      {!loading && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{totalWeek}</Text>
            <Text style={styles.summaryLabel}>Bu Hafta</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, pendingWeek > 0 && { color: '#d97706' }]}>{pendingWeek}</Text>
            <Text style={styles.summaryLabel}>Beklemede</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#16a34a' }]}>
              {weekAppointments.filter(a => a.status === 'Onaylandı').length}
            </Text>
            <Text style={styles.summaryLabel}>Onaylı</Text>
          </View>
        </View>
      )}

      {/* Days */}
      {week.map(day => {
        const dateStr = toDateStr(day);
        const apts = aptsByDate[dateStr] || [];
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);
        const pendingCount = apts.filter(a => a.status === 'Beklemede').length;

        return (
          <TouchableOpacity
            key={dateStr}
            onPress={() => goToDay(day)}
            style={[styles.dayCard, isToday && styles.dayCardToday]}
            activeOpacity={0.75}
          >
            {/* Day header row */}
            <View style={styles.dayHeaderRow}>
              <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                <Text style={[styles.dayShort, isToday && styles.dayShortToday]}>
                  {getDayShortTR(day).toUpperCase()}
                </Text>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                  {day.getDate()}
                </Text>
              </View>

              <View style={styles.dayMeta}>
                {apts.length === 0 ? (
                  <Text style={styles.noAptText}>Boş gün</Text>
                ) : (
                  <Text style={styles.aptCountText}>
                    {apts.length} randevu
                    {pendingCount > 0 && <Text style={styles.pendingBadge}>  {pendingCount} bekliyor</Text>}
                  </Text>
                )}
              </View>

              <Text style={styles.chevron}>›</Text>
            </View>

            {/* Appointment chips */}
            {apts.length > 0 && (
              <View style={styles.chipList}>
                {apts.slice(0, 4).map(apt => {
                  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
                  return (
                    <TouchableOpacity
                      key={apt.id}
                      onPress={() => onPressAppointment(apt)}
                      style={[styles.chip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.chipDot, { backgroundColor: cfg.border }]} />
                      <Text style={[styles.chipTime, { color: cfg.text }]}>
                        {formatTime(apt.appointment_time)}
                      </Text>
                      <Text style={[styles.chipName, { color: cfg.text }]} numberOfLines={1}>
                        {apt.profiles?.full_name || 'Misafir'}
                      </Text>
                      <Text style={[styles.chipService, { color: cfg.text }]} numberOfLines={1}>
                        {apt.service_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {apts.length > 4 && (
                  <View style={styles.moreChip}>
                    <Text style={styles.moreText}>+{apts.length - 4} daha</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 12, gap: 10, paddingBottom: 40 },
  center: { padding: 60, alignItems: 'center' },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  dayCardToday: { borderWidth: 2, borderColor: BRAND },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: {
    width: 48, height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeToday: { backgroundColor: BRAND },
  dayShort: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
  dayShortToday: { color: 'rgba(255,255,255,0.8)' },
  dayNum: { fontSize: 20, fontWeight: '800', color: '#1e293b', lineHeight: 24 },
  dayNumToday: { color: '#fff' },
  dayMeta: { flex: 1 },
  aptCountText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  noAptText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  pendingBadge: { color: '#d97706', fontWeight: '700' },
  chevron: { fontSize: 18, color: '#cbd5e1' },
  chipList: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTime: { fontSize: 12, fontWeight: '800', minWidth: 38 },
  chipName: { fontSize: 12, fontWeight: '700', flex: 1 },
  chipService: { fontSize: 11, opacity: 0.7, maxWidth: 90 },
  moreChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  moreText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
});
