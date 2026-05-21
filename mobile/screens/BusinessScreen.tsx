import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Alert, TextInput, Modal,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT, BORDER } from '../constants/colors';
import FinanceScreen from './FinanceScreen';

type InnerTab = 'services' | 'staff' | 'hours' | 'finance';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

interface Service { id: number; name: string; duration: number; price: number }
interface StaffItem { id: string; first_name: string; last_name: string; avatar_url?: string | null }
interface ShopHour { id?: number; day_of_week: number; open_time: string; close_time: string; is_closed: boolean }

export default function BusinessScreen() {
  const [tab, setTab] = useState<InnerTab>('services');
  const [shopId, setShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [hours, setHours] = useState<ShopHour[]>([]);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [editStaff, setEditStaff] = useState<StaffItem | null>(null);

  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState('');
  const [svcPrice, setSvcPrice] = useState('');
  const [staffFirst, setStaffFirst] = useState('');
  const [staffLast, setStaffLast] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', session.user.id).limit(1);
      if (!shops?.length) return;
      const id = shops[0].id;
      setShopId(id);

      const [{ data: svcs }, { data: stf }, { data: hrs }] = await Promise.all([
        supabase.from('services').select('id, name, duration, price').eq('shop_id', id).order('name'),
        supabase.from('staff').select('id, first_name, last_name, avatar_url').eq('shop_id', id).order('first_name'),
        supabase.from('shop_hours').select('*').eq('shop_id', id).order('day_of_week'),
      ]);
      setServices(svcs || []);
      setStaff(stf || []);

      // Fill in missing days
      const existing = hrs || [];
      const filled: ShopHour[] = Array.from({ length: 7 }, (_, i) => {
        const found = existing.find((h: any) => h.day_of_week === i);
        return found ?? { day_of_week: i, open_time: '09:00', close_time: '18:00', is_closed: false };
      });
      setHours(filled);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  // Services
  const openAddService = () => { setEditService(null); setSvcName(''); setSvcDuration(''); setSvcPrice(''); setShowServiceModal(true); };
  const openEditService = (s: Service) => { setEditService(s); setSvcName(s.name); setSvcDuration(String(s.duration)); setSvcPrice(String(s.price)); setShowServiceModal(true); };

  const saveService = async () => {
    if (!svcName.trim() || !svcDuration) { Alert.alert('Hata', 'Ad ve süre zorunlu'); return; }
    if (!shopId) return;
    const payload = { shop_id: shopId, name: svcName.trim(), duration: parseInt(svcDuration), price: parseFloat(svcPrice || '0') };
    if (editService) {
      await supabase.from('services').update(payload).eq('id', editService.id);
    } else {
      await supabase.from('services').insert(payload);
    }
    setShowServiceModal(false);
    loadAll();
  };

  const deleteService = (id: number) => {
    Alert.alert('Hizmeti Sil', 'Bu hizmeti silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('services').delete().eq('id', id); loadAll(); } },
    ]);
  };

  // Staff
  const openAddStaff = () => { setEditStaff(null); setStaffFirst(''); setStaffLast(''); setShowStaffModal(true); };
  const openEditStaff = (s: StaffItem) => { setEditStaff(s); setStaffFirst(s.first_name); setStaffLast(s.last_name); setShowStaffModal(true); };

  const saveStaff = async () => {
    if (!staffFirst.trim()) { Alert.alert('Hata', 'Ad zorunlu'); return; }
    if (!shopId) return;
    const payload = { shop_id: shopId, first_name: staffFirst.trim(), last_name: staffLast.trim() };
    if (editStaff) {
      await supabase.from('staff').update(payload).eq('id', editStaff.id);
    } else {
      await supabase.from('staff').insert(payload);
    }
    setShowStaffModal(false);
    loadAll();
  };

  const deleteStaff = (id: string) => {
    Alert.alert('Personeli Sil', 'Bu personeli silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('staff').delete().eq('id', id); loadAll(); } },
    ]);
  };

  // Hours
  const toggleDay = async (idx: number) => {
    const updated = hours.map((h, i) => i === idx ? { ...h, is_closed: !h.is_closed } : h);
    setHours(updated);
    await saveHour(updated[idx]);
  };

  const updateTime = (idx: number, field: 'open_time' | 'close_time', val: string) => {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  };

  const saveHour = async (h: ShopHour) => {
    if (!shopId) return;
    const payload = { shop_id: shopId, day_of_week: h.day_of_week, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed };
    if (h.id) {
      await supabase.from('shop_hours').update(payload).eq('id', h.id);
    } else {
      await supabase.from('shop_hours').upsert(payload, { onConflict: 'shop_id,day_of_week' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={BRAND} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>İşletme</Text>
      </View>

      {/* Inner tabs */}
      <View style={styles.tabRow}>
        {(['services', 'staff', 'hours', 'finance'] as InnerTab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'services' ? 'Hizmetler' : t === 'staff' ? 'Personel' : t === 'hours' ? 'Saatler' : 'Finans'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'finance' && <FinanceScreen />}

      {tab !== 'finance' && <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {/* ──── SERVICES ──── */}
        {tab === 'services' && (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={openAddService}>
              <Text style={styles.addBtnText}>+ Hizmet Ekle</Text>
            </TouchableOpacity>
            {services.length === 0 && <EmptyState icon="✂️" text="Henüz hizmet yok" />}
            {services.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.svcIcon}><Text style={{ fontSize: 18 }}>✂️</Text></View>
                </View>
                <View style={styles.cardMid}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardSub}>{s.duration} dk  ·  ₺{s.price}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditService(s)} style={styles.iconBtn}>
                    <Text style={styles.iconBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteService(s.id)} style={styles.iconBtn}>
                    <Text style={styles.iconBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ──── STAFF ──── */}
        {tab === 'staff' && (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={openAddStaff}>
              <Text style={styles.addBtnText}>+ Personel Ekle</Text>
            </TouchableOpacity>
            {staff.length === 0 && <EmptyState icon="👤" text="Henüz personel yok" />}
            {staff.map(s => {
              const initials = `${s.first_name[0] ?? ''}${s.last_name[0] ?? ''}`.toUpperCase();
              return (
                <View key={s.id} style={styles.card}>
                  <View style={[styles.avatar, { backgroundColor: BRAND_LIGHT }]}>
                    <Text style={[styles.avatarText, { color: BRAND }]}>{initials}</Text>
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={styles.cardTitle}>{s.first_name} {s.last_name}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditStaff(s)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteStaff(s.id)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ──── HOURS ──── */}
        {tab === 'hours' && (
          <>
            <Text style={styles.hoursHint}>Değişiklikler otomatik kaydedilir</Text>
            {hours.map((h, i) => (
              <View key={i} style={styles.hourRow}>
                <View style={styles.hourDay}>
                  <Text style={[styles.hourDayText, h.is_closed && styles.hourDayClosed]}>{DAYS[i]}</Text>
                </View>
                {h.is_closed ? (
                  <Text style={styles.closedText}>Kapalı</Text>
                ) : (
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={styles.timeInput}
                      value={h.open_time}
                      onChangeText={v => updateTime(i, 'open_time', v)}
                      onBlur={() => saveHour(h)}
                      maxLength={5} keyboardType="numeric"
                    />
                    <Text style={styles.timeSep}>–</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={h.close_time}
                      onChangeText={v => updateTime(i, 'close_time', v)}
                      onBlur={() => saveHour(h)}
                      maxLength={5} keyboardType="numeric"
                    />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => toggleDay(i)}
                  style={[styles.toggleBtn, !h.is_closed && styles.toggleBtnActive]}
                >
                  <View style={[styles.toggleKnob, !h.is_closed && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>}

      {/* Service Modal */}
      <Modal visible={showServiceModal} transparent animationType="slide" onRequestClose={() => setShowServiceModal(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowServiceModal(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editService ? 'Hizmeti Düzenle' : 'Hizmet Ekle'}</Text>
          <TextInput style={styles.input} placeholder="Hizmet adı" value={svcName} onChangeText={setSvcName} placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Süre (dakika)" value={svcDuration} onChangeText={setSvcDuration} keyboardType="numeric" placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Fiyat (₺)" value={svcPrice} onChangeText={setSvcPrice} keyboardType="decimal-pad" placeholderTextColor="#94a3b8" />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={saveService}>
              <Text style={styles.modalBtnPrimaryText}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowServiceModal(false)}>
              <Text style={styles.modalBtnGhostText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Staff Modal */}
      <Modal visible={showStaffModal} transparent animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowStaffModal(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editStaff ? 'Personeli Düzenle' : 'Personel Ekle'}</Text>
          <TextInput style={styles.input} placeholder="Ad" value={staffFirst} onChangeText={setStaffFirst} placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Soyad" value={staffLast} onChangeText={setStaffLast} placeholderTextColor="#94a3b8" />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={saveStaff}>
              <Text style={styles.modalBtnPrimaryText}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowStaffModal(false)}>
              <Text style={styles.modalBtnGhostText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    marginHorizontal: 16, marginVertical: 10, borderRadius: 14, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabBtnTextActive: { color: '#0f172a', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  addBtn: {
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', marginBottom: 14,
    shadowColor: BRAND, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardLeft: {},
  cardMid: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 14 },
  svcIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  hoursHint: { fontSize: 12, color: '#94a3b8', marginBottom: 10, textAlign: 'center' },
  hourRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  hourDay: { width: 80 },
  hourDayText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  hourDayClosed: { color: '#94a3b8' },
  closedText: { flex: 1, fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, fontWeight: '700', color: '#0f172a',
    borderWidth: 1, borderColor: BORDER, textAlign: 'center',
  },
  timeSep: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  toggleBtn: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0',
    padding: 2, justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: BRAND },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleKnobActive: { alignSelf: 'flex-end' },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: BRAND },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalBtnGhost: { backgroundColor: '#f1f5f9' },
  modalBtnGhostText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
