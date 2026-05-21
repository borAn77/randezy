import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { BRAND } from '../../constants/colors';
import { addDays, toDateStr, formatDateTR } from '../../utils/date';

interface Props {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, selectedDate, onSelect, onClose }: Props) {
  const today = new Date();

  // Generate 60 days: 30 past + today + 29 future
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i - 30));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Tarih Seç</Text>
        <FlatList
          data={days}
          keyExtractor={d => toDateStr(d)}
          style={styles.list}
          initialScrollIndex={30}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item }) => {
            const isSelected = toDateStr(item) === toDateStr(selectedDate);
            const isToday = toDateStr(item) === toDateStr(today);
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose(); }}
                style={[styles.item, isSelected && styles.itemSelected]}
              >
                <Text style={[styles.itemText, isSelected && styles.itemSelectedText, isToday && !isSelected && styles.itemTodayText]}>
                  {isToday ? `Bugün — ${formatDateTR(item)}` : formatDateTR(item)}
                </Text>
                {isSelected && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    paddingTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  list: { flex: 1 },
  item: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemSelected: { backgroundColor: BRAND },
  itemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  itemSelectedText: { color: '#fff', fontWeight: '700' },
  itemTodayText: { color: BRAND, fontWeight: '700' },
  check: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
});
