import React, { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, TouchableOpacity, Text,
  ScrollView, Modal, TextInput, FlatList,
} from 'react-native';
import { AppointmentsProvider, useAppointments, ViewMode } from '../contexts/AppointmentsContext';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import MonthView from '../components/calendar/MonthView';
import StaffView from '../components/calendar/StaffView';
import AppointmentDetailsModal from '../components/modals/AppointmentDetailsModal';
import SearchSheet from '../components/modals/SearchSheet';
import StaffFilterSheet from '../components/modals/StaffFilterSheet';
import { Appointment } from '../types/appointment';
import { BRAND, CATEGORY_COLORS, getCategoryForService } from '../constants/colors';
import { formatTime } from '../utils/time';
import { toDateStr, addDays, isSameDay, dowTR, DAYS_MON_FIRST, formatMonthTR, formatDateTR } from '../utils/date';

// ── View switcher labels ────────────────────────────────────────────────────
const VIEW_LABELS: { key: ViewMode; label: string }[] = [
  { key: 'gun',     label: 'Gün'      },
  { key: 'hafta',   label: 'Hafta'    },
  { key: 'ay',      label: 'Ay'       },
  { key: 'calisan', label: 'Çalışan'  },
  { key: 'liste',   label: 'Liste'    },
];

// ── Agenda list view (liste mode) ───────────────────────────────────────────
function AgendaListView({ onPressAppointment }: { onPressAppointment: (a: Appointment) => void }) {
  const { rangeAppointments, loading, refresh, selectedDate } = useAppointments();

  const days = [0, 1, 2].map(i => addDays(selectedDate, i));
  const today = new Date();

  const aptsByDate: Record<string, Appointment[]> = {};
  rangeAppointments.forEach(a => {
    if (!aptsByDate[a.appointment_date]) aptsByDate[a.appointment_date] = [];
    aptsByDate[a.appointment_date].push(a);
  });

  const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const DAYS_LONG = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.agendaContent}
      showsVerticalScrollIndicator={false}
    >
      {days.map(d => {
        const dateStr = toDateStr(d);
        const apts = (aptsByDate[dateStr] || []).sort((a, b) =>
          a.appointment_time.localeCompare(b.appointment_time)
        );
        const isToday = isSameDay(d, today);

        return (
          <View key={dateStr} style={styles.agendaDay}>
            <View style={styles.agendaDayHeader}>
              <Text style={[styles.agendaDayNum, isToday && { color: BRAND }]}>{d.getDate()}</Text>
              <Text style={styles.agendaDayName}>
                {DAYS_LONG[d.getDay()]} · {MONTHS_SHORT[d.getMonth()]}
                {isToday && <Text style={styles.agendaTodayBadge}> BUGÜN</Text>}
              </Text>
              <Text style={styles.agendaCount}>{apts.length} randevu</Text>
            </View>

            {apts.length === 0 && (
              <Text style={styles.agendaEmpty}>Bu gün için randevu yok.</Text>
            )}

            {apts.map(ap => {
              const cc = CATEGORY_COLORS[getCategoryForService(ap.service_name)];
              const isCancelled = ap.status === 'İptal Edildi' || ap.status === 'Gelmedi';
              const [aptH, aptM] = ap.appointment_time.split(':').map(Number);
              const endMin = aptH * 60 + aptM + ap.duration_minutes;
              const endStr = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`;
              const staffName = ap.staff
                ? `${ap.staff.first_name ?? ''} ${ap.staff.last_name ?? ''}`.trim()
                : null;

              return (
                <TouchableOpacity
                  key={ap.id}
                  onPress={() => onPressAppointment(ap)}
                  style={[styles.agendaCard, { opacity: isCancelled ? 0.6 : 1 }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.agendaEdge, { backgroundColor: cc.edge }]} />
                  <View style={styles.agendaTime}>
                    <Text style={[styles.agendaTimeStart, { color: cc.text }]}>
                      {formatTime(ap.appointment_time)}
                    </Text>
                    <Text style={styles.agendaTimeEnd}>{endStr}</Text>
                  </View>
                  <View style={styles.agendaMid}>
                    <Text
                      style={[
                        styles.agendaName, { color: cc.text },
                        isCancelled && styles.strikethrough,
                      ]}
                      numberOfLines={1}
                    >
                      {ap.profiles?.full_name || ap.profiles?.email || 'Misafir'}
                    </Text>
                    <Text style={[styles.agendaService, { color: cc.text }]} numberOfLines={1}>
                      {ap.service_name}
                    </Text>
                    <View style={styles.agendaStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: cc.edge }]} />
                      <Text style={[styles.agendaStatusText, { color: cc.text }]}>{ap.status}</Text>
                      {staffName && (
                        <>
                          <Text style={styles.agendaDot}>·</Text>
                          <Text style={styles.agendaStaff}>{staffName.split(' ')[0]}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  {ap.price > 0 && (
                    <Text style={styles.agendaPrice}>{ap.price}₺</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Week strip (7 days centred on selectedDate) ─────────────────────────────
function WeekStrip() {
  const { selectedDate, setSelectedDate, rangeAppointments, appointments } = useAppointments();
  const today = new Date();
  const start = addDays(selectedDate, -3);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const allApts = [...appointments, ...rangeAppointments];
  const countFor = (d: Date) =>
    allApts.filter(a => a.appointment_date === toDateStr(d)).length;

  return (
    <View style={styles.weekStrip}>
      {days.map(d => {
        const isToday = isSameDay(d, today);
        const isSel = isSameDay(d, selectedDate);
        const count = countFor(d);
        return (
          <TouchableOpacity
            key={toDateStr(d)}
            onPress={() => setSelectedDate(d)}
            style={[styles.stripDay, isSel && { backgroundColor: BRAND }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.stripDayLabel, isSel && { color: 'rgba(255,255,255,0.8)' }]}>
              {DAYS_MON_FIRST[dowTR(d)]}
            </Text>
            <Text style={[
              styles.stripDayNum,
              isSel && { color: '#fff', fontWeight: '700' },
              isToday && !isSel && { color: BRAND, fontWeight: '700' },
            ]}>{d.getDate()}</Text>
            {count > 0 && (
              <View style={[styles.stripDot, { backgroundColor: isSel ? '#fff' : BRAND }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Top bar + view switcher + date row ──────────────────────────────────────
function TopBar({
  onSearchPress,
  onFilterPress,
  staffFilterActive,
}: {
  onSearchPress: () => void;
  onFilterPress: () => void;
  staffFilterActive: boolean;
}) {
  const { viewMode, setViewMode, selectedDate, setSelectedDate } = useAppointments();
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  const step = (dir: -1 | 1) => {
    if (viewMode === 'hafta') setSelectedDate(addDays(selectedDate, dir * 7));
    else if (viewMode === 'ay') {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + dir, 1);
      setSelectedDate(d);
    } else {
      setSelectedDate(addDays(selectedDate, dir));
    }
  };

  const dateLabel = viewMode === 'ay'
    ? formatMonthTR(selectedDate)
    : formatDateTR(selectedDate);

  return (
    <View style={styles.topBar}>
      {/* Brand row */}
      <View style={styles.brandRow}>
        <View style={styles.brandLeft}>
          <View style={styles.brandLogo}>
            <Text style={styles.brandLogoText}>R</Text>
          </View>
          <View>
            <Text style={styles.brandSub}>Randezy · İşletme</Text>
            <Text style={styles.brandTitle}>Takvim</Text>
          </View>
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress}>
            <Text style={styles.iconBtnText}>⌕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onFilterPress}>
            <Text style={styles.iconBtnText}>⊟</Text>
            {staffFilterActive && <View style={styles.iconBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date row */}
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => step(-1)}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date())}
            style={[styles.todayBtn, isToday && { backgroundColor: BRAND, borderWidth: 0 }]}
          >
            <Text style={[styles.todayBtnText, isToday && { color: '#fff' }]}>Bugün</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => step(1)}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View switcher pill */}
      <View style={styles.viewSwitcher}>
        {VIEW_LABELS.map(({ key, label }) => {
          const active = viewMode === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setViewMode(key)}
              style={[styles.viewTab, active && styles.viewTabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewTabText, active && styles.viewTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Week strip for gun / calisan / liste views */}
      {(viewMode === 'gun' || viewMode === 'calisan' || viewMode === 'liste') && (
        <WeekStrip />
      )}
    </View>
  );
}

// ── Main calendar content ───────────────────────────────────────────────────
function CalendarContent() {
  const { viewMode, setViewMode, setSelectedDate, selectedStaffId, setSelectedStaffId } = useAppointments();
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const handlePickApt = (apt: Appointment) => setSelectedApt(apt);

  const handleSearchPick = (apt: Appointment) => {
    setSelectedApt(apt);
    setSelectedDate(new Date(apt.appointment_date));
    setViewMode('gun');
    setShowSearch(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar
        onSearchPress={() => setShowSearch(true)}
        onFilterPress={() => setShowFilter(true)}
        staffFilterActive={selectedStaffId !== null}
      />

      <View style={styles.body}>
        {viewMode === 'gun'     && <DayView   onPressAppointment={handlePickApt} />}
        {viewMode === 'hafta'   && <WeekView  onPressAppointment={handlePickApt} />}
        {viewMode === 'ay'      && <MonthView onPressDay={d => { setSelectedDate(d); setViewMode('gun'); }} />}
        {viewMode === 'calisan' && <StaffView onPressAppointment={handlePickApt} />}
        {viewMode === 'liste'   && <AgendaListView onPressAppointment={handlePickApt} />}
      </View>

      <AppointmentDetailsModal apt={selectedApt} onClose={() => setSelectedApt(null)} />

      <SearchSheet
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onPick={handleSearchPick}
      />

      <StaffFilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        value={selectedStaffId}
        onChange={setSelectedStaffId}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  body: { flex: 1 },

  // Top bar
  topBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  brandLogoText: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 22 },
  brandSub: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, lineHeight: 13 },
  brandTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  iconRow: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e8ecf0',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18, color: '#334155', lineHeight: 22 },
  iconBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BRAND, borderWidth: 1.5, borderColor: '#fff',
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateLabel: { fontSize: 18, fontWeight: '700', color: '#0f172a', letterSpacing: -0.3, flex: 1 },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e8ecf0',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { fontSize: 18, color: '#334155', lineHeight: 22 },
  todayBtn: {
    paddingHorizontal: 10, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: '#e8ecf0', backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
  },
  todayBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // View switcher
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 3,
    gap: 2,
    marginBottom: 4,
  },
  viewTab: { flex: 1, height: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  viewTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  viewTabText: { fontSize: 11.5, fontWeight: '500', color: '#94a3b8' },
  viewTabTextActive: { color: '#0f172a', fontWeight: '700' },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: -2,
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stripDayLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#94a3b8',
    fontWeight: '500',
  },
  stripDayNum: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  stripDot: { width: 4, height: 4, borderRadius: 2 },

  // Agenda list
  agendaContent: { padding: 14, gap: 20, paddingBottom: 40 },
  agendaDay: {},
  agendaDayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
    marginBottom: 8,
  },
  agendaDayNum: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  agendaDayName: { flex: 1, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  agendaTodayBadge: { color: BRAND, fontWeight: '700' },
  agendaCount: { fontSize: 11, color: '#94a3b8' },
  agendaEmpty: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', padding: 8 },
  agendaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8ecf0',
    overflow: 'hidden',
    marginBottom: 6,
    alignItems: 'stretch',
  },
  agendaEdge: { width: 4 },
  agendaTime: {
    width: 54,
    padding: 12,
    paddingRight: 0,
    gap: 2,
    justifyContent: 'center',
  },
  agendaTimeStart: { fontSize: 14, fontWeight: '700' },
  agendaTimeEnd: { fontSize: 10, color: '#94a3b8' },
  agendaMid: { flex: 1, padding: 12, paddingLeft: 10, gap: 2 },
  agendaName: { fontSize: 14, fontWeight: '700' },
  agendaService: { fontSize: 11.5, opacity: 0.8 },
  agendaStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  agendaStatusText: { fontSize: 11, fontWeight: '600' },
  agendaDot: { color: '#94a3b8' },
  agendaStaff: { fontSize: 11, color: '#94a3b8' },
  agendaPrice: {
    padding: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    alignSelf: 'center',
  },
  strikethrough: { textDecorationLine: 'line-through' },
});
