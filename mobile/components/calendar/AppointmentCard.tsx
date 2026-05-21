import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appointment } from '../../types/appointment';
import { STATUS_CONFIG } from '../../constants/colors';
import { topForTime, heightForDuration, formatTime } from '../../utils/time';

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

  const isPast = apt.appointment_date < new Date().toISOString().split('T')[0]
    || (apt.appointment_date === new Date().toISOString().split('T')[0]
      && apt.appointment_time < `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);

  const isCancelled = apt.status === 'İptal Edildi';
  const PADDING = 2;
  const colWidth = (totalWidth / cols) - PADDING;

  return (
    <TouchableOpacity
      onPress={() => onPress(apt)}
      style={[
        styles.card,
        {
          top,
          height: Math.max(height - 2, 26),
          left: col * (totalWidth / cols) + PADDING,
          width: colWidth - PADDING,
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          opacity: (isPast || isCancelled) ? 0.6 : 1,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.name, { color: config.text }, isCancelled && styles.strikethrough]}
        numberOfLines={1}
      >
        {apt.profiles?.full_name || apt.profiles?.email || 'Misafir'}
      </Text>
      {height > 36 && (
        <Text style={[styles.service, { color: config.text }]} numberOfLines={1}>
          {apt.service_name}
        </Text>
      )}
      {height > 52 && (
        <Text style={[styles.time, { color: config.text }]}>
          {formatTime(apt.appointment_time)} · {apt.duration_minutes} dk
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  name: { fontSize: 12, fontWeight: '700' },
  service: { fontSize: 10, fontWeight: '500', marginTop: 1, opacity: 0.85 },
  time: { fontSize: 9, fontWeight: '500', marginTop: 2, opacity: 0.7 },
  strikethrough: { textDecorationLine: 'line-through' },
});
