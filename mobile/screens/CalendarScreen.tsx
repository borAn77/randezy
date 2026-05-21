import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, FlatList } from 'react-native';
import { AppointmentsProvider, useAppointments } from '../contexts/AppointmentsContext';
import CalendarHeader from '../components/calendar/CalendarHeader';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import DailyStatsBar from '../components/calendar/DailyStatsBar';
import AppointmentDetailsModal from '../components/modals/AppointmentDetailsModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import { Appointment } from '../types/appointment';
import { STATUS_CONFIG, BRAND, BRAND_LIGHT } from '../constants/colors';
import { formatTime } from '../utils/time';
import { formatDateShortTR } from '../utils/date';

function TabBar() {
  const { tabMode, setTabMode, viewMode, setViewMode } = useAppointments();
  return (
    <View style={tabStyles.container}>
      {/* Takvim / Liste */}
      <View style={tabStyles.mainTabs}>
        {(['calendar', 'list'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setTabMode(tab)}
            style={[tabStyles.mainTab, tabMode === tab && tabStyles.mainTabActive]}
          >
            <Text style={[tabStyles.mainTabText, tabMode === tab && tabStyles.mainTabTextActive]}>
              {tab === 'calendar' ? '📅  Takvim' : '☰  Liste'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gün / Hafta — only when calendar tab */}
      {tabMode === 'calendar' && (
        <View style={tabStyles.subTabs}>
          {(['day', 'week'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[tabStyles.subTab, viewMode === m && tabStyles.subTabActive]}
            >
              <Text style={[tabStyles.subTabText, viewMode === m && tabStyles.subTabTextActive]}>
                {m === 'day' ? 'Gün' : 'Hafta'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ListView({ onPressAppointment }: { onPressAppointment: (apt: Appointment) => void }) {
  const { appointments, loading, refresh } = useAppointments();

  return (
    <FlatList
      data={appointments}
      keyExtractor={a => a.id}
      contentContainerStyle={listStyles.content}
      onRefresh={refresh}
      refreshing={loading}
      ListEmptyComponent={
        <View style={listStyles.empty}>
          <Text style={listStyles.emptyIcon}>📋</Text>
          <Text style={listStyles.emptyText}>Bu gün randevu yok</Text>
        </View>
      }
      renderItem={({ item }) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Beklemede'];
        const staffName = item.staff
          ? `${item.staff.first_name ?? ''} ${item.staff.last_name ?? ''}`.trim()
          : null;
        return (
          <TouchableOpacity
            onPress={() => onPressAppointment(item)}
            style={[listStyles.card, { borderLeftColor: cfg.border }]}
            activeOpacity={0.8}
          >
            <View style={listStyles.cardLeft}>
              <Text style={listStyles.cardTime}>{formatTime(item.appointment_time)}</Text>
              <Text style={listStyles.cardDuration}>{item.duration_minutes} dk</Text>
            </View>
            <View style={listStyles.cardMid}>
              <Text style={listStyles.cardName} numberOfLines={1}>
                {item.profiles?.full_name || item.profiles?.email || 'Misafir'}
              </Text>
              <Text style={listStyles.cardService} numberOfLines={1}>{item.service_name}</Text>
              {staffName && <Text style={listStyles.cardStaff}>{staffName}</Text>}
            </View>
            <View style={listStyles.cardRight}>
              <View style={[listStyles.statusDot, { backgroundColor: cfg.border }]} />
              <Text style={[listStyles.statusText, { color: cfg.text }]}>{item.status}</Text>
              {item.price > 0 && <Text style={listStyles.price}>₺{item.price}</Text>}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

function CalendarContent() {
  const { viewMode, tabMode, selectedDate, setSelectedDate } = useAppointments();
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <TabBar />

      {tabMode === 'calendar' && (
        <CalendarHeader onOpenDatePicker={() => setShowDatePicker(true)} />
      )}

      {tabMode === 'list' && (
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Randevular</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.listDateBtn}>
            <Text style={styles.listDateText}>📅 {formatDateShortTR(selectedDate)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.body}>
        {tabMode === 'calendar' ? (
          viewMode === 'day'
            ? <DayView onPressAppointment={setSelectedApt} />
            : <WeekView onPressAppointment={setSelectedApt} />
        ) : (
          <ListView onPressAppointment={setSelectedApt} />
        )}
      </View>

      {tabMode === 'calendar' && <DailyStatsBar />}

      <AppointmentDetailsModal apt={selectedApt} onClose={() => setSelectedApt(null)} />

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

export default function CalendarScreen() {
  return (
    <AppointmentsProvider>
      <CalendarContent />
    </AppointmentsProvider>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 3, gap: 2 },
  mainTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  mainTabActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  mainTabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  mainTabTextActive: { color: '#fff', fontWeight: '700' },
  subTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3 },
  subTab: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  subTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  subTabText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  subTabTextActive: { color: '#1e293b', fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  body: { flex: 1 },
  listHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
  },
  listTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  listDateBtn: { backgroundColor: BRAND_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  listDateText: { fontSize: 13, color: BRAND, fontWeight: '700' },
});

const listStyles = StyleSheet.create({
  content: { padding: 12, gap: 8, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { width: 48, alignItems: 'center' },
  cardTime: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cardDuration: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  cardMid: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardService: { fontSize: 12, color: '#64748b' },
  cardStaff: { fontSize: 11, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  price: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
});
