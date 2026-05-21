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
  const config = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
  const top = topForTime(apt.appointment_time);
  const height = heightForDuration(apt.duration_minutes);

  const todayStr = toDateStr(new Date());
  const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const isPast = apt.appointment_date < todayStr
    || (apt.appointment_date === todayStr && apt.appointment_time.slice(0, 5) < nowTime);

  const isCancelled = apt.status === 'İptal Edildi';
  const GAP = 3;
  const colWidth = totalWidth / cols;
  const cardLeft = col * colWidth + GAP;
  const cardWidth = colWidth - GAP * 2;

  const endMinutes = parseInt(apt.appointment_time.split(':')[0]) * 60
    + parseInt(apt.appointment_time.split(':')[1]) + apt.duration_minutes;
  const endHH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endMM = String(endMinutes % 60).padStart(2, '0');

  return (
    <TouchableOpacity
      onPress={() => onPress(apt)}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          top: top + 1,
          height: Math.max(height - 2, 36),
          left: cardLeft,
          width: cardWidth,
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          opacity: (isPast || isCancelled) ? 0.65 : 1,
        },
      ]}
    >
      {/* Color accent bar */}
      <View style={[styles.accent, { backgroundColor: config.border }]} />

      <View style={styles.inner}>
        <Text
          style={[styles.name, { color: config.text }, isCancelled && styles.strike]}
          numberOfLines={1}
        >
          {apt.profiles?.full_name || apt.profiles?.email || 'Misafir'}
        </Text>

        {height > 50 && (
          <Text style={[styles.service, { color: config.text }]} numberOfLines={1}>
            {apt.service_name}
          </Text>
        )}

        {height > 72 && (
          <Text style={[styles.timeRange, { color: config.text }]}>
            {formatTime(apt.appointment_time)} – {endHH}:{endMM}
          </Text>
        )}
      </View>

      {height > 46 && apt.price > 0 && (
        <Text style={[styles.price, { color: config.text }]}>₺{apt.price}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderLeftWidth: 4,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accent: {
    width: 0,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    justifyContent: 'center',
    gap: 2,
  },
  name: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  service: { fontSize: 11, fontWeight: '500', opacity: 0.8 },
  timeRange: { fontSize: 10, fontWeight: '600', opacity: 0.7, marginTop: 1 },
  price: {
    fontSize: 11,
    fontWeight: '700',
    paddingRight: 8,
    paddingTop: 5,
    opacity: 0.85,
  },
  strike: { textDecorationLine: 'line-through' },
});
