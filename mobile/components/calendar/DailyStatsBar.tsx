import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { formatDateShortTR } from '../../utils/date';
import { BRAND } from '../../constants/colors';

export default function DailyStatsBar() {
  const { stats, selectedDate } = useAppointments();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.dateLabel}>Günlük Özet</Text>
        <Text style={styles.dateVal}>{formatDateShortTR(selectedDate)}</Text>
      </View>

      <StatItem icon="📅" value={stats.total} label="Toplam" color="#64748b" />
      <StatItem icon="✓" value={stats.confirmed} label="Onaylı" color="#15803d" />
      <StatItem icon="●" value={stats.pending} label="Bekleyen" color="#b45309" />
      <StatItem icon="✕" value={stats.cancelled} label="İptal" color="#dc2626" />

      <View style={styles.occupancy}>
        <Text style={styles.occupancyPct}>{stats.occupancyPct}%</Text>
        <Text style={styles.occupancyLabel}>Doluluk</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${stats.occupancyPct}%` as any }]} />
        </View>
      </View>
    </View>
  );
}

function StatItem({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  left: { marginRight: 4 },
  dateLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateVal: { fontSize: 12, color: '#1e293b', fontWeight: '700' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  occupancy: { flex: 1.2, alignItems: 'center' },
  occupancyPct: { fontSize: 18, fontWeight: '800', color: BRAND },
  occupancyLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  barBg: { width: '100%', height: 3, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 2 },
  barFill: { height: 3, backgroundColor: BRAND, borderRadius: 2 },
});
