import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appointment } from '../../types/appointment';
import { CATEGORY_COLORS, getCategoryForService } from '../../constants/colors';
import { topForTime, heightForDuration, formatTime } from '../../utils/time';
import { toDateStr } from '../../utils/date';

interface Props {
  apt: Appointment;
  col: number;
  cols: number;
  totalWidth: number;
  onPress: (apt: Appointment) => void;
  dense?: boolean;
}

export default function AppointmentCard({ apt, col, cols, totalWidth, onPress, dense = false }: Props) {
  const cc = CATEGORY_COLORS[getCategoryForService(apt.service_name)];
  const top = topForTime(apt.appointment_time);
  const height = heightForDuration(apt.duration_minutes);

  const todayStr = toDateStr(new Date());
  const nowTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  const isPast = apt.appointment_date < todayStr
    || (apt.appointment_date === todayStr && apt.appointment_time.slice(0, 5) < nowTime);
  const isCancelled = apt.status === 'İptal Edildi';
  const isNoshow = apt.status === 'Gelmedi';

  const GAP = 3;
  const colWidth = totalWidth / cols;

  const endMin = parseInt(apt.appointment_time.split(':')[0]) * 60
    + parseInt(apt.appointment_time.split(':')[1]) + apt.duration_minutes;
  const endStr = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`;

  const staffName = apt.staff
    ? `${apt.staff.first_name ?? ''} ${apt.staff.last_name ?? ''}`.trim()
    : null;

  return (
    <TouchableOpacity
      onPress={() => onPress(apt)}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          top: top + 1,
          height: Math.max(height - 2, dense ? 20 : 36),
          left: col * colWidth + GAP,
          width: colWidth - GAP * 2,
          backgroundColor: cc.bg,
          opacity: (isPast || isCancelled || isNoshow) ? 0.58 : 1,
        },
      ]}
    >
      {/* Left edge accent */}
      <View style={[styles.edge, { backgroundColor: cc.edge }]} />

      <View style={styles.inner}>
        {height >= 28 && (
          <View style={styles.timeRow}>
            <View style={[styles.dot, { backgroundColor: cc.edge }]} />
            <Text style={[styles.timeText, { color: cc.text }]} numberOfLines={1}>
              {formatTime(apt.appointment_time)}
              {height >= 50 && <Text style={{ opacity: 0.55 }}>–{endStr}</Text>}
            </Text>
          </View>
        )}

        {height >= 22 && (
          <Text
            style={[
              styles.nameText,
              { color: cc.text },
              isCancelled && styles.strikethrough,
            ]}
            numberOfLines={1}
          >
            {apt.profiles?.full_name || apt.profiles?.email || 'Misafir'}
          </Text>
        )}

        {height >= 56 && !dense && (
          <Text style={[styles.serviceText, { color: cc.text }]} numberOfLines={1}>
            {apt.service_name}
            {staffName ? ` · ${staffName.split(' ')[0][0]}.` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  edge: { width: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  inner: { flex: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  timeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  nameText: { fontSize: 12, fontWeight: '700', lineHeight: 15, letterSpacing: -0.1 },
  serviceText: { fontSize: 10, opacity: 0.75, lineHeight: 13 },
  strikethrough: { textDecorationLine: 'line-through' },
});
