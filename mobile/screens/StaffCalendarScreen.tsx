import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FRONTEND_URL } from '../config';
import { STATUS_CONFIG, BG, SURFACE, BORDER, BRAND } from '../constants/colors';
import { toDateStr } from '../utils/date';

// Personel günlük takvimi — salt-okunur, 30 sn polling.
// Kod her istekte server'da yeniden doğrulanır: işletme sahibi kodu
// yenilediği an 401 döner ve ekran otomatik giriş ekranına düşer.
// Kapsam server'da kısıtlı: sadece kendi randevuları, fiyat/telefon yok.

const POLL_MS = 30_000;

type CalApt = {
  id: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
  customerName: string;
};

type CalData = {
  staffName: string;
  shopName: string;
  hours: { open?: string; close?: string } | null;
  appointments: CalApt[];
};

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export default function StaffCalendarScreen({ code, onLogout }: {
  code: string;
  onLogout: () => void;
}) {
  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [data, setData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const dateRef = useRef(date);
  useEffect(() => { dateRef.current = date; }, [date]);

  const fetchCalendar = useCallback(async (targetDate: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${FRONTEND_URL}/api/staff/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, date: targetDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        Alert.alert('Oturum sonlandı', 'Kodun yenilenmiş veya geçersiz. İşletme sahibinden güncel kodu iste.');
        onLogout();
        return;
      }
      if (res.ok && dateRef.current === targetDate) {
        setData({ staffName: json.staffName, shopName: json.shopName, hours: json.hours, appointments: json.appointments || [] });
        setLastSync(new Date());
      }
    } catch { /* bağlantı hatası — mevcut veriyi koru, sonraki poll dener */ }
    if (!silent) setLoading(false);
  }, [code, onLogout]);

  // İlk yükleme + tarih değişimi
  useEffect(() => { fetchCalendar(date); }, [date, fetchCalendar]);

  // 30 sn polling
  useEffect(() => {
    const t = setInterval(() => fetchCalendar(dateRef.current, true), POLL_MS);
    return () => clearInterval(t);
  }, [fetchCalendar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCalendar(dateRef.current, true);
    setRefreshing(false);
  }, [fetchCalendar]);

  const d = new Date(`${date}T12:00:00`);
  const isToday = date === toDateStr(new Date());
  const apts = data?.appointments ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.shopName} numberOfLines={1}>{data?.shopName ?? ''}</Text>
          <View style={styles.staffRow}>
            <Ionicons name="person" size={13} color={BRAND} />
            <Text style={styles.staffName} numberOfLines={1}>{data?.staffName ?? 'Personel'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert('Çıkış', 'Personel oturumundan çıkılsın mı?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: onLogout },
          ])}
        >
          <Ionicons name="log-out-outline" size={16} color="#64748b" />
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Tarih navigasyonu */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDays(date, -1))}>
          <Ionicons name="chevron-back" size={18} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateTitle}>{d.getDate()} {MONTHS_TR[d.getMonth()]} · {DAYS_TR[d.getDay()]}</Text>
          <View style={styles.dateSubRow}>
            {data?.hours?.open ? (
              <Text style={styles.hoursText}>{data.hours.open} – {data.hours.close}</Text>
            ) : (
              <Text style={styles.hoursText}>Çalışma saati tanımlı değil</Text>
            )}
            {!isToday && (
              <TouchableOpacity onPress={() => setDate(toDateStr(new Date()))}>
                <Text style={styles.todayLink}>Bugün</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDays(date, 1))}>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Randevu listesi */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {loading && !data ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 48 }} />
        ) : apts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Bu gün için randevun yok</Text>
            <Text style={styles.emptySub}>Yeni randevular otomatik olarak burada belirir.</Text>
          </View>
        ) : (
          apts.map((a) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG['Beklemede'];
            const cancelled = a.status === 'İptal Edildi';
            return (
              <View key={a.id} style={[styles.card, cancelled && styles.cardCancelled]}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{a.time}</Text>
                  <Text style={styles.durText}>{a.duration} dk</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.customer, cancelled && styles.strike]} numberOfLines={1}>{a.customerName}</Text>
                  <Text style={styles.service} numberOfLines={1}>{a.serviceName}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Text style={[styles.pillText, { color: cfg.text }]}>{a.status}</Text>
                </View>
              </View>
            );
          })
        )}

        {lastSync && (
          <Text style={styles.syncText}>
            Son güncelleme {lastSync.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · 30 sn'de bir yenilenir
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerLeft: { flex: 1, minWidth: 0, marginRight: 12 },
  shopName: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  staffName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  dateSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  hoursText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  todayLink: { fontSize: 12, fontWeight: '800', color: BRAND },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 6 },
  emptySub: { fontSize: 12, color: '#94a3b8' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardCancelled: { opacity: 0.55 },
  timeBox: {
    width: 56,
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 8,
  },
  timeText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  durText: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  cardBody: { flex: 1, minWidth: 0 },
  customer: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  strike: { textDecorationLine: 'line-through' },
  service: { fontSize: 12.5, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 10, fontWeight: '800' },
  syncText: {
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});
