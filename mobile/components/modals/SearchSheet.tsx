import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Appointment } from '../../types/appointment';
import { CATEGORY_COLORS, getCategoryForService } from '../../constants/colors';
import { formatTime } from '../../utils/time';
import { useAppointments } from '../../contexts/AppointmentsContext';
import { formatDateShortTR, parseDateStr } from '../../utils/date';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (apt: Appointment) => void;
}

export default function SearchSheet({ visible, onClose, onPick }: Props) {
  const { appointments, rangeAppointments } = useAppointments();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setQuery('');
    }
  }, [visible]);

  // Search across day + range appointments (union by id)
  const allApts = useMemo(() => {
    const seen = new Set<string>();
    return [...appointments, ...rangeAppointments].filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [appointments, rangeAppointments]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return allApts
      .filter(a => {
        const name = (a.profiles?.full_name ?? '').toLowerCase();
        const email = (a.profiles?.email ?? '').toLowerCase();
        const phone = (a.profiles?.phone ?? '').toLowerCase();
        const service = a.service_name.toLowerCase();
        const staffName = a.staff
          ? `${a.staff.first_name ?? ''} ${a.staff.last_name ?? ''}`.toLowerCase()
          : '';
        return name.includes(q) || email.includes(q) || phone.includes(q)
          || service.includes(q) || staffName.includes(q);
      })
      .sort((a, b) =>
        a.appointment_date.localeCompare(b.appointment_date) ||
        a.appointment_time.localeCompare(b.appointment_time)
      )
      .slice(0, 30);
  }, [query, allApts]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Search input */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Müşteri, telefon, hizmet veya çalışan…"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Empty state */}
          {!query && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Aramak için bir şeyler yazın.{'\n'}
                Geçmiş ve gelecek tüm randevular taranır.
              </Text>
            </View>
          )}

          {query && results.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.noResults}>"{query}" için sonuç bulunamadı.</Text>
            </View>
          )}

          {/* Results */}
          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {results.map(ap => {
              const cc = CATEGORY_COLORS[getCategoryForService(ap.service_name)];
              const staffName = ap.staff
                ? `${ap.staff.first_name ?? ''} ${ap.staff.last_name ?? ''}`.trim()
                : null;
              const date = parseDateStr(ap.appointment_date);

              return (
                <TouchableOpacity
                  key={ap.id}
                  onPress={() => { onPick(ap); }}
                  style={styles.resultCard}
                  activeOpacity={0.8}
                >
                  <View style={[styles.resultEdge, { backgroundColor: cc.edge }]} />
                  <View style={styles.resultMid}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {ap.profiles?.full_name || ap.profiles?.email || 'Misafir'}
                    </Text>
                    <Text style={styles.resultSub} numberOfLines={1}>
                      {ap.service_name}
                      {staffName ? ` · ${staffName.split(' ')[0]}` : ''}
                    </Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.resultTime}>{formatTime(ap.appointment_time)}</Text>
                    <Text style={styles.resultDate}>{formatDateShortTR(date)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,15,0.4)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8ecf0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 18, color: '#94a3b8', lineHeight: 22 },
  input: { flex: 1, fontSize: 14, color: '#0f172a' },
  clearBtn: { padding: 2 },
  clearBtnText: { fontSize: 16, color: '#94a3b8' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  noResults: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  results: { flexGrow: 0 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8ecf0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    gap: 0,
  },
  resultEdge: { width: 3, alignSelf: 'stretch' },
  resultMid: { flex: 1, padding: 12, paddingLeft: 10 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  resultSub: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  resultRight: { padding: 12, alignItems: 'flex-end' },
  resultTime: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  resultDate: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
});
