import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { FRONTEND_URL } from '../config';

type Shop = { id: string; name: string; category: string };
type Appointment = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_name: string;
  price: number;
  profiles?: { full_name?: string; phone?: string; email?: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  'Beklemede': '#f59e0b',
  'Onaylandı': '#22c55e',
  'İptal Edildi': '#ef4444',
  'Tamamlandı': '#6366f1',
};

export default function AppointmentsScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Beklemede' | 'Onaylandı'>('all');

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: shops, error: shopErr } = await supabase
        .from('shops')
        .select('id, name, category')
        .eq('owner_id', session.user.id)
        .limit(1);

      if (shopErr) throw shopErr;
      if (!shops?.length) return;

      const s = shops[0];
      setShop(s);

      const { data: apts, error: aptErr } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, status, service_name, price, profiles(full_name, phone, email)')
        .eq('shop_id', s.id)
        .order('appointment_date', { ascending: false });

      if (aptErr) throw aptErr;
      setAppointments((apts as Appointment[]) || []);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Veri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleStatusUpdate = async (item: Appointment, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', item.id);
    if (error) return;

    setAppointments(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a));

    if (!item.profiles?.email) return;
    const type = newStatus === 'Onaylandı' ? 'appointment_confirmed' : 'appointment_rejected';
    fetch(`${FRONTEND_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        customerEmail: item.profiles.email,
        customerName: item.profiles.full_name || 'Müşteri',
        shopName: shop?.name || '',
        serviceName: item.service_name,
        appointmentDate: item.appointment_date,
        appointmentTime: item.appointment_time,
      }),
    }).catch(() => null);
  };

  const filtered = appointments.filter(a =>
    filter === 'all' ? true : a.status === filter
  );

  const renderItem = ({ item }: { item: Appointment }) => {
    const color = STATUS_COLOR[item.status] ?? '#94a3b8';
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.customerName}>
              {item.profiles?.full_name || item.profiles?.email || 'Misafir'}
            </Text>
            <Text style={styles.serviceName}>{item.service_name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.dateTime}>
          {item.appointment_date} — {item.appointment_time?.slice(0, 5)}
        </Text>
        <Text style={styles.price}>{item.price} TL</Text>

        {item.status === 'Beklemede' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => handleStatusUpdate(item, 'Onaylandı')}
            >
              <Text style={styles.actionText}>Onayla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => handleStatusUpdate(item, 'İptal Edildi')}
            >
              <Text style={styles.actionText}>İptal Et</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{shop?.name ?? 'İşletmem'}</Text>
          <Text style={styles.headerSub}>{appointments.length} randevu</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['all', 'Beklemede', 'Onaylandı'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tümü' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {shop ? 'Randevu bulunamadı.' : 'Henüz bir işletmen yok.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#c7d2fe', fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  serviceName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dateTime: { color: '#64748b', fontSize: 13 },
  price: { color: '#1e293b', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
});
