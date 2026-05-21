import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { TIME_AXIS_WIDTH, PIXELS_PER_MINUTE } from '../../constants/layout';

function SkeletonBlock({ top, height, width, left }: { top: number; height: number; width: number; left: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.block, { top, height, width, left, opacity }]}
    />
  );
}

export default function SkeletonDay() {
  const { width } = useWindowDimensions();
  const gridWidth = width - TIME_AXIS_WIDTH - 16;

  const blocks = [
    { top: 2 * 60 * PIXELS_PER_MINUTE, h: 60 * PIXELS_PER_MINUTE, w: gridWidth * 0.6, l: 0 },
    { top: 3.5 * 60 * PIXELS_PER_MINUTE, h: 90 * PIXELS_PER_MINUTE, w: gridWidth * 0.55, l: 4 },
    { top: 5 * 60 * PIXELS_PER_MINUTE, h: 60 * PIXELS_PER_MINUTE, w: gridWidth * 0.65, l: 0 },
    { top: 3.5 * 60 * PIXELS_PER_MINUTE, h: 60 * PIXELS_PER_MINUTE, w: gridWidth * 0.38, l: gridWidth * 0.58 },
  ];

  return (
    <View style={[styles.container, { height: 8 * 60 * PIXELS_PER_MINUTE, width: gridWidth }]}>
      {blocks.map((b, i) => (
        <SkeletonBlock key={i} top={b.top} height={b.h} width={b.w} left={b.l} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  block: { position: 'absolute', backgroundColor: '#e2e8f0', borderRadius: 10 },
});
