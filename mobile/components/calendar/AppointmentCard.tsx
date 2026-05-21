import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appointment } from '../../types/appointment';
import { STATUS_CONFIG } from '../../constants/colors';
import { topForTime, heightForDuration, formatTime } from '../../utils/time';
import { toDateStr } from '../../utils/date';

interface Props {
  apt: Appointment;
  col: number;
  cols: number;
  totalWidth: number;
  onPress: (apt: Appointment) => void;
}

export default function AppointmentCard({ apt, col, cols, totalWidth, onPress }: Props) {
  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
  const top = topForTime(apt.appointment_time);
  const height = heightForDuration(apt.duration_minutes);

  const todayStr = toDateStr(new Date());
  const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const isPast = apt.appointment_date < todayStr
    || (apt.appointment_date === todayStr && apt.appointment_time.slice(0, 5) < nowTime);
  const isCancelled = apt.status === 'İptal Edildi';

  const GAP = 3;
  const colWidth = totalWidth / cols;
  const endMin = parseInt(apt.appointment_time.split(':')[0]) * 60
    + parseInt(apt.appointment_time.split(':')[1]) + apt.duration_minutes;
  const endStr = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  const staffName = apt.staff ? `${apt.staff.first_name ?? ''} ${apt.staff.last_name ?? ''}`.trim() : null;

  return (
    <TouchableOpacity
      onPress={() => onPress(apt)}
      activeOpacity={0.82}
      style={[
        styles.card,
        {
          top: top + 1,
          height: Math.max(height - 2, 36),
          left: col * colWidth + GAP,
          width: colWidth - GAP * 2,
          backgroundColor: cfg.bg,
          borderLeftColor: cfg.border,
          opacity: (isPast || isCancelled) ? 0.62 : 1,
        },
      ]}
    >
      {/* Time row */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: cfg.text }]}>
          {formatTime(apt.appointment_time)}
          {height > 44 ? ` – ${endStr}` : ''}
        </Text>
        <View style={[styles.iconBadge, { backgroundColor: cfg.iconBg }]}>
          <Text style={[styles.icon, { color: cfg.text }]}>{cfg.icon}</Text>
        </View>
      </View>

      {/* Customer */}
      <Text style={[styles.name, { color: cfg.text }, isCancelled && styles.strike]} numberOfLines={1}>
        {apt.profiles?.full_name || apt.profiles?.email || 'Misafir'}
      </Text>

      {height > 62 && (
        <Text style={[styles.service, { color: cfg.text }]} numberOfLines={1}>
          {apt.service_name}
        </Text>
      )}

      {height > 82 && staffName && (
        <Text style={[styles.staff, { color: cfg.text }]} numberOfLines={1}>
          👤 {staffName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderLeftWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 10, fontWeight: '700' },
  iconBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 8, fontWeight: '900' },
  name: { fontSize: 12, fontWeight: '800', marginTop: 2, letterSpacing: -0.2 },
  service: { fontSize: 10, fontWeight: '500', marginTop: 1, opacity: 0.85 },
  staff: { fontSize: 9, fontWeight: '500', marginTop: 2, opacity: 0.7 },
  strike: { textDecorationLine: 'line-through' },
});
