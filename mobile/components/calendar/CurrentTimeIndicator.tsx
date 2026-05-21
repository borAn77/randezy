import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { nowMinutesFromDayStart, isWithinBusinessHours, TOTAL_HEIGHT } from '../../utils/time';
import { PIXELS_PER_MINUTE } from '../../constants/layout';

export default function CurrentTimeIndicator() {
  const [top, setTop] = useState(nowMinutesFromDayStart() * PIXELS_PER_MINUTE);

  useEffect(() => {
    const interval = setInterval(() => {
      setTop(nowMinutesFromDayStart() * PIXELS_PER_MINUTE);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!isWithinBusinessHours() || top < 0 || top > TOTAL_HEIGHT) return null;

  return (
    <View style={[styles.container, { top }]} pointerEvents="none">
      <View style={styles.dot} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginLeft: -5 },
  line: { flex: 1, height: 2, backgroundColor: '#ef4444' },
});
