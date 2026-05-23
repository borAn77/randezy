import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { BRAND, BRAND_LIGHT, CATEGORY_COLORS, getCategoryForService } from '../../constants/colors';
import { addDays, isSameDay, toDateStr, dowTR, DAYS_MON_FIRST, getMonthStart } from '../../utils/date';

const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

interface Props {
  onPressDay: (date: Date) => void;
}

export default function MonthView({ onPressDay }: Props) {
  const { selectedDate, rangeAppointments } = useAppointments();
  const { width } = useWindowDimensions();
  const today = new Date();

  const first = getMonthStart(selectedDate);
  // Monday-first offset
  const offset = dowTR(first);
  const gridStart = addDays(first, -offset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const aptsByDate: Record<string, { count: number; cats: string[] }> = {};
  rangeAppointments.forEach(a => {
    if (!aptsByDate[a.appointment_date]) aptsByDate[a.appointment_date] = { count: 0, cats: [] };
    aptsByDate[a.appointment_date].count++;
    const cat = getCategoryForService(a.service_name);
    if (!aptsByDate[a.appointment_date].cats.includes(cat) && aptsByDate[a.appointment_date].cats.length < 4) {
      aptsByDate[a.appointment_date].cats.push(cat);
    }
  });

  const cellW = (width - 28) / 7;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Weekday header */}
      <View style={styles.weekHeader}>
        {DAYS_MON_FIRST.map(d => (
          <View key={d} style={[styles.weekHeaderCell, { width: cellW }]}>
            <Text style={styles.weekHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* 6×7 grid */}
      <View style={styles.grid}>
        {cells.map((d, i) => {
          const dateStr = toDateStr(d);
          const inMonth = d.getMonth() === selectedDate.getMonth();
          const isToday = isSameDay(d, today);
          const isSel = isSameDay(d, selectedDate);
          const info = aptsByDate[dateStr];

          return (
            <TouchableOpacity
              key={i}
              onPress={() => onPressDay(d)}
              activeOpacity={0.7}
              style={[
                styles.cell,
                { width: cellW, minHeight: cellW * 1.15 },
                isSel && { backgroundColor: BRAND_LIGHT },
                isToday && !isSel && styles.cellToday,
                !inMonth && styles.cellOutMonth,
              ]}
            >
              <Text style={[
                styles.cellNum,
                isToday && { color: BRAND, fontWeight: '800' },
                isSel && { color: BRAND, fontWeight: '800' },
              ]}>{d.getDate()}</Text>

              {info && info.count > 0 && (
                <View style={styles.cellBottom}>
                  <View style={styles.catDots}>
                    {info.cats.map(cat => (
                      <View
                        key={cat}
                        style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS].edge }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.cellCount}>{info.count} randevu</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 32 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekHeaderCell: { alignItems: 'center', paddingVertical: 6 },
  weekHeaderText: {
    fontSize: 10, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  cell: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e8ecf0',
    borderRadius: 12,
    padding: 6,
    justifyContent: 'space-between',
    margin: 2,
  },
  cellToday: { borderWidth: 1.5, borderColor: BRAND },
  cellOutMonth: { opacity: 0.35 },
  cellNum: { fontSize: 13, fontWeight: '500', color: '#0f172a', textAlign: 'left' },
  cellBottom: { gap: 2 },
  catDots: { flexDirection: 'row', gap: 2 },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  cellCount: { fontSize: 9, color: '#94a3b8', letterSpacing: 0.1 },
});
