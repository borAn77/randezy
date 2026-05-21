import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { START_HOUR, END_HOUR, PIXELS_PER_MINUTE, TIME_AXIS_WIDTH } from '../../constants/layout';

const SLOT_HEIGHT = 30 * PIXELS_PER_MINUTE; // 30 minutes per slot

export default function TimeAxis() {
  const slots = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    slots.push(h);
  }

  return (
    <View style={[styles.container, { width: TIME_AXIS_WIDTH }]}>
      {slots.map((h, i) => (
        <View key={h} style={[styles.slot, { height: i < slots.length - 1 ? SLOT_HEIGHT : 1 }]}>
          <Text style={styles.label}>{String(h).padStart(2, '0')}:00</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0 },
  slot: { justifyContent: 'flex-start' },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    paddingTop: 2,
    paddingRight: 8,
    textAlign: 'right',
  },
});
