import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { START_HOUR, END_HOUR, PIXELS_PER_MINUTE, TIME_AXIS_WIDTH } from '../../constants/layout';

const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;

export default function TimeAxis() {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <View style={[styles.container, { width: TIME_AXIS_WIDTH }]}>
      {hours.map((h, i) => (
        <View key={h} style={[styles.slot, { height: i < hours.length - 1 ? HOUR_HEIGHT : 20 }]}>
          <Text style={[styles.label, h === new Date().getHours() && styles.labelNow]}>
            {String(h).padStart(2, '0')}:00
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0 },
  slot: { justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 10 },
  label: {
    fontSize: 11,
    color: '#b0bec5',
    fontWeight: '600',
    paddingTop: 3,
    lineHeight: 14,
  },
  labelNow: { color: '#ef4444', fontWeight: '800' },
});
