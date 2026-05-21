import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT } from '../constants/colors';

interface MonthStats {
  revenue: number; completed: number; cancelled: number; total: number;
}

interface ServiceStat { name: string; count: number; revenue: number }
interface DayStat { date: string; revenue: number; count: number }

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = { week: 'Bu Hafta', month: 'Bu Ay', year: 'Bu Yıl' };

function getPeriodRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'week') {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const start = new Date(now); start.setDate(now.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (period === 'month') {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { start, end };
  }
  return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
}

export default function FinanceScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<MonthStats>({ revenue: 0, completed: 0, cancelled: 0, total: 0 });
  const [services, setServices] = useState<ServiceStat[]>([]);
  const [days, setDays] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: Period) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', session.user.id).limit(1);
      if (!shops?.length) return;
      const shopId = shops[0].id;

      const { start, end } = getPeriodRange(p);
      const { data: apts } = await supabase
        .from('appointments')
        .select('status, price, service_name, appointment_date')
        .eq('shop_id', shopId)
        .gte('appointment_date', start)
        .lte('appointment_date', end);

      const list = apts || [];
      const completed = list.filter((a: any) => a.status === 'Tamamlandı');
      const revenue = completed.reduce((s: number, a: any) => s + (a.price ?? 0), 0);

      setStats({
        revenue,
        completed: completed.length,
        cancelled: list.filter((a: any) => a.status === 'İptal Edildi').length,
        total: list.length,
      });

      // Service breakdown
      const svcMap: Record<string, ServiceStat> = {};
      for (const a of completed) {
        if (!svcMap[a.service_name]) svcMap[a.service_name] = { name: a.service_name, count: 0, revenue: 0 };
        svcMap[a.service_name].count++;
        svcMap[a.service_name].revenue += a.price ?? 0;
      }
      setServices(Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8));

      // Daily revenue for bar chart (last 7 days for week, last 30 for month)
      const dayMap: Record<string, DayStat> = {};
      for (const a of completed) {
        if (!dayMap[a.appointment_date]) dayMap[a.appointment_date] = { date: a.appointment_date, revenue: 0, count: 0 };
        dayMap[a.appointment_date].revenue += a.price ?? 0;
        dayMap[a.appointment_date].count++;
      }
      const dayList = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
      setDays(p === 'week' ? dayList : dayList.slice(-14));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const onRefresh = () => { setRefreshing(true); load(period); };

  const maxRevenue = Math.max(...days.map(d => d.revenue), 1);

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
          <Text style={styles.title}>Finans</Text>
        </View>

        {/* Period tabs */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { setPeriod(p); setLoading(true); }}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Toplam Gelir</Text>
          <Text style={styles.heroValue}>₺{stats.revenue.toLocaleString('tr-TR')}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.total}</Text>
              <Text style={styles.heroStatLabel}>Randevu</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: '#10b981' }]}>{stats.completed}</Text>
              <Text style={styles.heroStatLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: '#ef4444' }]}>{stats.cancelled}</Text>
              <Text style={styles.heroStatLabel}>İptal</Text>
            </View>
          </View>
        </View>

        {/* Bar chart */}
        {days.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Günlük Gelir</Text>
            <View style={styles.barChart}>
              {days.map(d => {
                const pct = d.revenue / maxRevenue;
                const barH = Math.max(4, Math.round(pct * 80));
                const dd = d.date.slice(8);
                const mm = d.date.slice(5, 7);
                return (
                  <View key={d.date} style={styles.barCol}>
                    <View style={[styles.bar, { height: barH, backgroundColor: pct > 0.6 ? BRAND : '#c7d2fe' }]} />
                    <Text style={styles.barLabel}>{dd}/{mm}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Service breakdown */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hizmet Bazlı Gelir</Text>
            {services.map((s, i) => (
              <View key={s.name} style={styles.serviceRow}>
                <View style={styles.serviceRankBadge}>
                  <Text style={styles.serviceRank}>{i + 1}</Text>
                </View>
                <View style={styles.serviceMid}>
                  <Text style={styles.serviceName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.serviceCount}>{s.count} randevu</Text>
                </View>
                <Text style={styles.serviceRevenue}>₺{s.revenue.toLocaleString('tr-TR')}</Text>
              </View>
            ))}
          </View>
        )}

        {stats.total === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Bu dönemde veri yok</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  periodRow: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 14, padding: 4, marginBottom: 16, gap: 4,
  },
  periodTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodTabText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  periodTabTextActive: { color: '#0f172a', fontWeight: '700' },
  heroCard: {
    backgroundColor: BRAND, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  heroValue: { fontSize: 36, fontWeight: '900', color: '#fff', marginVertical: 8 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end', height: 100,
    backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '80%', borderRadius: 4 },
  barLabel: { fontSize: 8, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  serviceRankBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceRank: { fontSize: 12, fontWeight: '800', color: BRAND },
  serviceMid: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  serviceCount: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  serviceRevenue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b' },
});
