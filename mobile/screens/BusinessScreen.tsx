import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Alert, TextInput, Modal, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT, BORDER } from '../constants/colors';
import { toDateStr, parseDateStr, formatDateShortTR } from '../utils/date';
import DatePickerModal from '../components/modals/DatePickerModal';
import FinanceScreen from './FinanceScreen';

type InnerTab = 'services' | 'staff' | 'hours' | 'campaigns' | 'finance';

const TAB_LABELS: Record<InnerTab, string> = {
  services: 'Hizmetler',
  staff: 'Personel',
  hours: 'Saatler',
  campaigns: 'Kampanyalar',
  finance: 'Finans',
};

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

interface Service  { id: number; name: string; duration: number; price: number }
interface StaffItem { id: string; first_name: string; last_name: string; avatar_url?: string | null }
interface ShopHour  { id?: number; day_of_week: number; open_time: string; close_time: string; is_closed: boolean }

type CampaignType = 'percentage' | 'fixed' | 'today_special' | 'last_minute';
interface Campaign {
  id: string;
  shop_id: number;
  title: string;
  type: CampaignType;
  discount_value: number | null;
  start_date: string;
  end_date: string;
  service_ids: string[];
  is_active: boolean;
  created_at: string;
}

const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  percentage:    'Yüzde İndirim (%)',
  fixed:         'Sabit İndirim (₺)',
  today_special: 'Bugüne Özel',
  last_minute:   'Son Dakika',
};

const QUICK_TEMPLATES: { label: string; type: CampaignType; val: string }[] = [
  { label: 'Hafta Sonu',   type: 'percentage',    val: '20' },
  { label: 'İlk Randevu',  type: 'percentage',    val: '15' },
  { label: 'Sadık Müşteri',type: 'percentage',    val: '10' },
  { label: 'Bugüne Özel',  type: 'today_special', val: '25' },
  { label: 'Son Dakika',   type: 'last_minute',   val: '30' },
  { label: 'Doğum Günü',   type: 'percentage',    val: '20' },
];

function calcDiscounted(price: number, c: Campaign): number {
  const val = c.discount_value ?? 0;
  if (c.type === 'fixed') return Math.max(0, Math.round(price - val));
  return Math.max(0, Math.round(price * (1 - Math.min(100, val) / 100)));
}

function campaignStatus(c: Campaign): 'active' | 'upcoming' | 'paused' | 'expired' {
  const today = toDateStr(new Date());
  if (!c.is_active) return 'paused';
  if (c.end_date < today) return 'expired';
  if (c.start_date > today) return 'upcoming';
  return 'active';
}

const STATUS_CONFIG = {
  active:   { label: 'Aktif',      color: '#16a34a', bg: '#dcfce7' },
  upcoming: { label: 'Yakında',    color: '#d97706', bg: '#fef3c7' },
  paused:   { label: 'Durduruldu', color: '#64748b', bg: '#f1f5f9' },
  expired:  { label: 'Sona Erdi',  color: '#94a3b8', bg: '#f8fafc' },
};

export default function BusinessScreen() {
  const route = useRoute<any>();
  const [tab, setTab] = useState<InnerTab>('services');
  const [shopId, setShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── existing data ────────────────────────────────────────────
  const [services, setServices]  = useState<Service[]>([]);
  const [staff, setStaff]        = useState<StaffItem[]>([]);
  const [hours, setHours]        = useState<ShopHour[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // ─── service modal ────────────────────────────────────────────
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [svcName, setSvcName]         = useState('');
  const [svcDuration, setSvcDuration] = useState('');
  const [svcPrice, setSvcPrice]       = useState('');

  // ─── staff modal ─────────────────────────────────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editStaff, setEditStaff]           = useState<StaffItem | null>(null);
  const [staffFirst, setStaffFirst]         = useState('');
  const [staffLast, setStaffLast]           = useState('');

  // ─── campaign modal ───────────────────────────────────────────
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editCampaign, setEditCampaign]           = useState<Campaign | null>(null);
  const [savingCampaign, setSavingCampaign]       = useState(false);
  const [campTitle, setCampTitle]                 = useState('');
  const [campType, setCampType]                   = useState<CampaignType>('percentage');
  const [campValue, setCampValue]                 = useState('');
  const [campStartDate, setCampStartDate]         = useState(toDateStr(new Date()));
  const [campEndDate, setCampEndDate]             = useState(toDateStr(new Date(Date.now() + 30 * 864e5)));
  const [campServiceIds, setCampServiceIds]       = useState<string[]>([]);
  const [campActive, setCampActive]               = useState(true);
  const [showStartPicker, setShowStartPicker]     = useState(false);
  const [showEndPicker, setShowEndPicker]         = useState(false);

  // ─── navigation param: initialTab ────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const initial = route.params?.initialTab as InnerTab | undefined;
      if (initial) setTab(initial);
    }, [route.params])
  );

  // ─── load ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', session.user.id).limit(1);
      if (!shops?.length) return;
      const id = shops[0].id;
      setShopId(id);

      const [{ data: svcs }, { data: stf }, { data: hrs }, { data: camps }] = await Promise.all([
        supabase.from('services').select('id, name, duration, price').eq('shop_id', id).order('name'),
        supabase.from('staff').select('id, first_name, last_name, avatar_url').eq('shop_id', id).order('first_name'),
        supabase.from('shop_hours').select('*').eq('shop_id', id).order('day_of_week'),
        supabase.from('campaigns').select('*').eq('shop_id', id).order('created_at', { ascending: false }),
      ]);
      setServices(svcs || []);
      setStaff(stf || []);
      setCampaigns(camps || []);

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

  // ─── service handlers ─────────────────────────────────────────
  const openAddService  = () => { setEditService(null); setSvcName(''); setSvcDuration(''); setSvcPrice(''); setShowServiceModal(true); };
  const openEditService = (s: Service) => { setEditService(s); setSvcName(s.name); setSvcDuration(String(s.duration)); setSvcPrice(String(s.price)); setShowServiceModal(true); };

  const saveService = async () => {
    if (!svcName.trim() || !svcDuration) { Alert.alert('Hata', 'Ad ve süre zorunlu'); return; }
    if (!shopId) return;
    const payload = { shop_id: shopId, name: svcName.trim(), duration: parseInt(svcDuration), price: parseFloat(svcPrice || '0') };
    if (editService) await supabase.from('services').update(payload).eq('id', editService.id);
    else             await supabase.from('services').insert(payload);
    setShowServiceModal(false);
    loadAll();
  };

  const deleteService = (id: number) => Alert.alert('Hizmeti Sil', 'Bu hizmeti silmek istiyor musunuz?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('services').delete().eq('id', id); loadAll(); } },
  ]);

  // ─── staff handlers ───────────────────────────────────────────
  const openAddStaff  = () => { setEditStaff(null); setStaffFirst(''); setStaffLast(''); setShowStaffModal(true); };
  const openEditStaff = (s: StaffItem) => { setEditStaff(s); setStaffFirst(s.first_name); setStaffLast(s.last_name); setShowStaffModal(true); };

  const saveStaff = async () => {
    if (!staffFirst.trim()) { Alert.alert('Hata', 'Ad zorunlu'); return; }
    if (!shopId) return;
    const payload = { shop_id: shopId, first_name: staffFirst.trim(), last_name: staffLast.trim() };
    if (editStaff) await supabase.from('staff').update(payload).eq('id', editStaff.id);
    else           await supabase.from('staff').insert(payload);
    setShowStaffModal(false);
    loadAll();
  };

  const deleteStaff = (id: string) => Alert.alert('Personeli Sil', 'Bu personeli silmek istiyor musunuz?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('staff').delete().eq('id', id); loadAll(); } },
  ]);

  // ─── hours handlers ───────────────────────────────────────────
  const toggleDay  = async (idx: number) => {
    const updated = hours.map((h, i) => i === idx ? { ...h, is_closed: !h.is_closed } : h);
    setHours(updated);
    await saveHour(updated[idx]);
  };
  const updateTime = (idx: number, field: 'open_time' | 'close_time', val: string) =>
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  const saveHour   = async (h: ShopHour) => {
    if (!shopId) return;
    const payload = { shop_id: shopId, day_of_week: h.day_of_week, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed };
    if (h.id) await supabase.from('shop_hours').update(payload).eq('id', h.id);
    else       await supabase.from('shop_hours').upsert(payload, { onConflict: 'shop_id,day_of_week' });
  };

  // ─── campaign handlers ────────────────────────────────────────
  const resetCampForm = () => {
    setCampTitle(''); setCampType('percentage'); setCampValue('');
    setCampStartDate(toDateStr(new Date()));
    setCampEndDate(toDateStr(new Date(Date.now() + 30 * 864e5)));
    setCampServiceIds([]); setCampActive(true);
    setEditCampaign(null);
  };

  const openAddCampaign = () => { resetCampForm(); setShowCampaignModal(true); };

  const openEditCampaign = (c: Campaign) => {
    setEditCampaign(c);
    setCampTitle(c.title);
    setCampType(c.type);
    setCampValue(c.discount_value != null ? String(c.discount_value) : '');
    setCampStartDate(c.start_date);
    setCampEndDate(c.end_date);
    setCampServiceIds(c.service_ids || []);
    setCampActive(c.is_active);
    setShowCampaignModal(true);
  };

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setCampTitle(t.label);
    setCampType(t.type);
    setCampValue(t.val);
  };

  const saveCampaign = async () => {
    if (!campTitle.trim()) { Alert.alert('Eksik bilgi', 'Kampanya başlığı zorunludur.'); return; }
    const val = parseFloat(campValue);
    if (!campValue || isNaN(val) || val <= 0) { Alert.alert('Eksik bilgi', 'Geçerli bir indirim değeri girin.'); return; }
    if (campType === 'percentage' && val > 100) { Alert.alert('Hata', "Yüzde indirim 100'den fazla olamaz."); return; }
    if (campStartDate > campEndDate) { Alert.alert('Hata', 'Başlangıç tarihi bitiş tarihinden önce olmalı.'); return; }
    if (!shopId) return;

    setSavingCampaign(true);
    try {
      const payload = {
        shop_id: shopId,
        title: campTitle.trim(),
        type: campType,
        discount_value: val,
        start_date: campStartDate,
        end_date: campEndDate,
        service_ids: campServiceIds,
        is_active: campActive,
      };
      const { error } = editCampaign
        ? await supabase.from('campaigns').update(payload).eq('id', editCampaign.id)
        : await supabase.from('campaigns').insert([payload]);
      if (error) { Alert.alert('Hata', error.message); return; }
      setShowCampaignModal(false);
      resetCampForm();
      loadAll();
    } finally {
      setSavingCampaign(false);
    }
  };

  const toggleCampaignActive = async (c: Campaign) => {
    const { error } = await supabase.from('campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) { Alert.alert('Hata', error.message); return; }
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteCampaign = (id: string) => Alert.alert('Kampanyayı Sil', 'Bu kampanya silinsin mi?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      await supabase.from('campaigns').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    }},
  ]);

  const toggleServiceId = (id: string) => {
    setCampServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ─── render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={BRAND} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>İşletme</Text>
      </View>

      {/* Tab row — horizontal scroll for 5 tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabRowWrap} contentContainerStyle={styles.tabRow}
      >
        {(['services', 'staff', 'hours', 'campaigns', 'finance'] as InnerTab[]).map(t => (
          <TouchableOpacity
            key={t} onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'finance' && <FinanceScreen />}

      {tab !== 'finance' && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        >
          {/* ──── HİZMETLER ──── */}
          {tab === 'services' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={openAddService}>
                <Text style={styles.addBtnText}>+ Hizmet Ekle</Text>
              </TouchableOpacity>
              {services.length === 0 && <EmptyState icon="✂️" text="Henüz hizmet yok" />}
              {services.map(s => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.svcIcon}><Text style={{ fontSize: 18 }}>✂️</Text></View>
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

          {/* ──── PERSONEL ──── */}
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

          {/* ──── SAATLER ──── */}
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
                      <TextInput style={styles.timeInput} value={h.open_time} onChangeText={v => updateTime(i, 'open_time', v)} onBlur={() => saveHour(h)} maxLength={5} keyboardType="numeric" />
                      <Text style={styles.timeSep}>–</Text>
                      <TextInput style={styles.timeInput} value={h.close_time} onChangeText={v => updateTime(i, 'close_time', v)} onBlur={() => saveHour(h)} maxLength={5} keyboardType="numeric" />
                    </View>
                  )}
                  <TouchableOpacity onPress={() => toggleDay(i)} style={[styles.toggleBtn, !h.is_closed && styles.toggleBtnActive]}>
                    <View style={[styles.toggleKnob, !h.is_closed && styles.toggleKnobActive]} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* ──── KAMPANYALAR ──── */}
          {tab === 'campaigns' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={openAddCampaign}>
                <Text style={styles.addBtnText}>+ Kampanya Oluştur</Text>
              </TouchableOpacity>

              {campaigns.length === 0 && <EmptyState icon="🏷️" text="Henüz kampanya yok" />}

              {campaigns.map(c => {
                const st = campaignStatus(c);
                const cfg = STATUS_CONFIG[st];
                const applicable = services.filter(s =>
                  !c.service_ids?.length || c.service_ids.includes(String(s.id))
                ).slice(0, 3);
                const typeLabel = c.type === 'percentage' || c.type === 'today_special' || c.type === 'last_minute'
                  ? `%${c.discount_value} İndirim`
                  : `₺${c.discount_value} İndirim`;

                return (
                  <View key={c.id} style={styles.campCard}>
                    {/* başlık + badge */}
                    <View style={styles.campHeader}>
                      <Text style={styles.campTitle} numberOfLines={1}>{c.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>

                    {/* tür + tarih */}
                    <Text style={styles.campMeta}>
                      {typeLabel}  ·  {formatDateShortTR(parseDateStr(c.start_date))} → {formatDateShortTR(parseDateStr(c.end_date))}
                    </Text>

                    {/* etkilenen hizmetler */}
                    {applicable.length > 0 && (
                      <View style={styles.campServices}>
                        {applicable.map(s => (
                          <Text key={s.id} style={styles.campServiceRow}>
                            {s.name}: <Text style={styles.campOldPrice}>₺{s.price}</Text>
                            {' → '}
                            <Text style={styles.campNewPrice}>₺{calcDiscounted(s.price, c)}</Text>
                          </Text>
                        ))}
                        {(c.service_ids?.length === 0) && services.length > 3 && (
                          <Text style={styles.campServiceRow}>+{services.length - 3} hizmet daha</Text>
                        )}
                      </View>
                    )}

                    {/* aksiyonlar */}
                    <View style={styles.campActions}>
                      <TouchableOpacity
                        style={[styles.campToggleBtn, st === 'active' && styles.campToggleBtnPause]}
                        onPress={() => toggleCampaignActive(c)}
                      >
                        <Text style={[styles.campToggleBtnText, st === 'active' && styles.campToggleBtnTextPause]}>
                          {c.is_active ? 'Durdur' : 'Aktif Et'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditCampaign(c)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCampaign(c.id)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* ════ Service Modal ════ */}
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

      {/* ════ Staff Modal ════ */}
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

      {/* ════ Campaign Modal (pageSheet) ════ */}
      <Modal
        visible={showCampaignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowCampaignModal(false); resetCampForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* header */}
          <View style={styles.campModalHeader}>
            <TouchableOpacity onPress={() => { setShowCampaignModal(false); resetCampForm(); }}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.campModalTitle}>{editCampaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

            {/* Hızlı şablonlar (sadece yeni kampanya) */}
            {!editCampaign && (
              <>
                <Text style={styles.campFormLabel}>HIZLI ŞABLONLAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {QUICK_TEMPLATES.map(t => (
                    <TouchableOpacity key={t.label} style={styles.templateChip} onPress={() => applyTemplate(t)}>
                      <Text style={styles.templateChipText}>{t.label}</Text>
                      <Text style={styles.templateChipSub}>
                        {t.type === 'fixed' ? `₺${t.val}` : `%${t.val}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Başlık */}
            <Text style={styles.campFormLabel}>KAMPANYA BAŞLIĞI *</Text>
            <View style={styles.campFormCard}>
              <TextInput
                style={styles.campInput}
                placeholder="Örn: Hafta Sonu İndirimi"
                placeholderTextColor="#94a3b8"
                value={campTitle}
                onChangeText={setCampTitle}
              />
            </View>

            {/* İndirim tipi */}
            <Text style={styles.campFormLabel}>İNDİRİM TİPİ *</Text>
            <View style={styles.campFormCard}>
              {(['percentage', 'fixed', 'today_special', 'last_minute'] as CampaignType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeRow, campType === t && styles.typeRowSelected]}
                  onPress={() => setCampType(t)}
                >
                  <View style={[styles.radioOuter, campType === t && styles.radioOuterSelected]}>
                    {campType === t && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.typeLabel, campType === t && styles.typeLabelSelected]}>
                    {CAMPAIGN_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* İndirim değeri */}
            <Text style={styles.campFormLabel}>
              {campType === 'fixed' ? 'İNDİRİM TUTARI (₺) *' : 'İNDİRİM ORANI (%) *'}
            </Text>
            <View style={styles.campFormCard}>
              <TextInput
                style={styles.campInput}
                placeholder={campType === 'fixed' ? 'Örn: 50' : 'Örn: 20'}
                placeholderTextColor="#94a3b8"
                value={campValue}
                onChangeText={setCampValue}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Tarih aralığı */}
            <Text style={styles.campFormLabel}>TARİH ARALIĞI *</Text>
            <View style={styles.campFormCard}>
              <TouchableOpacity style={styles.dateRow} onPress={() => setShowStartPicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                <Text style={styles.dateLabel}>Başlangıç</Text>
                <Text style={styles.dateValue}>{formatDateShortTR(parseDateStr(campStartDate))}</Text>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              </TouchableOpacity>
              <View style={styles.dateDivider} />
              <TouchableOpacity style={styles.dateRow} onPress={() => setShowEndPicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                <Text style={styles.dateLabel}>Bitiş</Text>
                <Text style={styles.dateValue}>{formatDateShortTR(parseDateStr(campEndDate))}</Text>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Hizmet seçimi */}
            {services.length > 0 && (
              <>
                <Text style={styles.campFormLabel}>HİZMETLER (boşsa tümüne geçerli)</Text>
                <View style={styles.campFormCard}>
                  {services.map(s => {
                    const checked = campServiceIds.includes(String(s.id));
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.svcCheckRow}
                        onPress={() => toggleServiceId(String(s.id))}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.svcCheckLabel}>{s.name}</Text>
                        <Text style={styles.svcCheckPrice}>₺{s.price}</Text>
                        {checked && campValue && !isNaN(parseFloat(campValue)) && (
                          <Text style={styles.svcCheckDiscounted}>
                            → ₺{calcDiscounted(s.price, {
                              type: campType,
                              discount_value: parseFloat(campValue),
                            } as Campaign)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Aktif toggle */}
            <View style={styles.campActiveRow}>
              <Text style={styles.campActiveLabel}>Hemen Aktif Et</Text>
              <Switch
                value={campActive}
                onValueChange={setCampActive}
                trackColor={{ true: BRAND, false: '#e2e8f0' }}
                thumbColor="#fff"
              />
            </View>

          </ScrollView>

          {/* Kaydet butonu */}
          <View style={styles.campModalFooter}>
            <TouchableOpacity
              style={[styles.campSaveBtn, savingCampaign && { opacity: 0.6 }]}
              onPress={saveCampaign}
              disabled={savingCampaign}
              activeOpacity={0.85}
            >
              {savingCampaign
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.campSaveBtnText}>{editCampaign ? 'Güncelle' : 'Yayınla'}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date pickers */}
      <DatePickerModal
        visible={showStartPicker}
        selectedDate={parseDateStr(campStartDate)}
        onSelect={d => setCampStartDate(toDateStr(d))}
        onClose={() => setShowStartPicker(false)}
      />
      <DatePickerModal
        visible={showEndPicker}
        selectedDate={parseDateStr(campEndDate)}
        onSelect={d => setCampEndDate(toDateStr(d))}
        onClose={() => setShowEndPicker(false)}
      />
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

  tabRowWrap: { marginHorizontal: 16, marginVertical: 10 },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 14, padding: 4, gap: 4,
  },
  tabBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
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
  toggleBtn: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0', padding: 2, justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: BRAND },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleKnobActive: { alignSelf: 'flex-end' },

  // Campaign list cards
  campCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  campHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  campTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  campMeta: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  campServices: { gap: 2, marginBottom: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  campServiceRow: { fontSize: 12, color: '#475569' },
  campOldPrice: { textDecorationLine: 'line-through', color: '#94a3b8' },
  campNewPrice: { color: '#16a34a', fontWeight: '700' },
  campActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  campToggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
  },
  campToggleBtnPause: { backgroundColor: '#fff7ed', borderColor: '#fcd34d' },
  campToggleBtnText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  campToggleBtnTextPause: { color: '#d97706' },

  // Campaign modal
  campModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  campModalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  campFormLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  campFormCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  campInput: {
    fontSize: 15, color: '#0f172a', paddingHorizontal: 16, paddingVertical: 14,
  },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  typeRowSelected: { backgroundColor: '#eef2ff' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderColor: BRAND },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },
  typeLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  typeLabelSelected: { color: '#0f172a', fontWeight: '700' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dateLabel: { fontSize: 14, color: '#94a3b8', flex: 1 },
  dateValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  dateDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  svcCheckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  svcCheckLabel: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },
  svcCheckPrice: { fontSize: 13, color: '#94a3b8' },
  svcCheckDiscounted: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  campActiveRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  campActiveLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  campModalFooter: {
    paddingHorizontal: 16, paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  campSaveBtn: {
    backgroundColor: BRAND, borderRadius: 16, height: 52,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  campSaveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Templates
  templateChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 2,
  },
  templateChipText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  templateChipSub: { fontSize: 11, color: BRAND, fontWeight: '600' },

  // Shared
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
