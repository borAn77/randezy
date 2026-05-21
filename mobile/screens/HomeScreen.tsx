import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT, STATUS_CONFIG } from '../constants/colors';
import { formatTime } from '../utils/time';
import { toDateStr, formatDateTR } from '../utils/date';

interface TodayStats {
  total: number; pending: number; confirmed: number;
  completed: number; revenue: number;
}

interface PendingApt {
  id: string; appointment_time: string; service_name: string;
  duration_minutes: number;
  profiles?: { full_name?: string | null; phone?: string | null } | null;
}

export default function HomeScreen() {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [stats, setStats] = useState<TodayStats>({ total: 0, pending: 0, confirmed: 0, completed: 0, revenue: 0 });
  const [pending, setPending] = useState<PendingApt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: shops }, { data: profile }] = await Promise.all([
        supabase.from('shops').select('id, name').eq('owner_id', session.user.id).limit(1),
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
      ]);

      if (!shops?.length) return;
      const shopId = shops[0].id;
      setShopName(shops[0].name ?? '');
      setOwnerName(profile?.full_name ?? '');

      const today = toDateStr(new Date());
      const { data: apts } = await supabase
        .from('appointments')
        .select('*, profiles(full_name, phone)')
        .eq('shop_id', shopId)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      const list = apts || [];
      const statsCalc: TodayStats = {
        total: list.length,
        pending: list.filter((a: any) => a.status === 'Beklemede').length,
        confirmed: list.filter((a: any) => a.status === 'Onaylandı').length,
        completed: list.filter((a: any) => a.status === 'Tamamlandı').length,
        revenue: list
          .filter((a: any) => a.status === 'Tamamlandı')
          .reduce((s: number, a: any) => s + (a.price ?? 0), 0),
      };
      setStats(statsCalc);
      setPending(list.filter((a: any) => a.status === 'Beklemede').slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const firstName = ownerName.split(' ')[0] || 'Hoş geldiniz';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={BRAND} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
            <Text style={styles.shopName}>{shopName}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formatDateTR(new Date())}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Toplam" value={stats.total} color="#6366f1" icon="📅" />
          <StatCard label="Bekleyen" value={stats.pending} color="#f59e0b" icon="⏳" />
          <StatCard label="Onaylı" value={stats.confirmed} color="#10b981" icon="✓" />
          <StatCard label="Tamamlanan" value={stats.completed} color="#3b82f6" icon="✓✓" />
        </View>

        {/* Revenue */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Bugünkü Gelir</Text>
            <Text style={styles.revenueValue}>₺{stats.revenue.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.revenueIcon}>
            <Text style={{ fontSize: 28 }}>💰</Text>
          </View>
        </View>

        {/* Pending appointments */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bekleyen Randevular</Text>
            {pending.map(apt => (
              <View key={apt.id} style={styles.pendingCard}>
                <View style={styles.pendingLeft}>
                  <Text style={styles.pendingTime}>{formatTime(apt.appointment_time)}</Text>
                  <Text style={styles.pendingDuration}>{apt.duration_minutes} dk</Text>
                </View>
                <View style={styles.pendingMid}>
                  <Text style={styles.pendingName} numberOfLines={1}>
                    {apt.profiles?.full_name || 'Misafir'}
                  </Text>
                  <Text style={styles.pendingService} numberOfLines={1}>{apt.service_name}</Text>
                </View>
                <View style={[styles.pendingBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.pendingBadgeText, { color: '#92400e' }]}>Bekliyor</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {stats.total === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Bugün randevu yok</Text>
            <Text style={styles.emptySub}>Müşteriler randevu aldığında burada görünür</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  shopName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  dateBadge: {
    backgroundColor: BRAND_LIGHT, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe',
  },
  dateText: { fontSize: 12, color: BRAND, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  revenueCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  revenueLeft: {},
  revenueLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  revenueValue: { fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  revenueIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef9c3',
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  pendingCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#fcd34d',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  pendingLeft: { width: 46, alignItems: 'center' },
  pendingTime: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  pendingDuration: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  pendingMid: { flex: 1 },
  pendingName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pendingService: { fontSize: 12, color: '#64748b', marginTop: 1 },
  pendingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingBadgeText: { fontSize: 10, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
