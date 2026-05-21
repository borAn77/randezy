import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT, BORDER } from '../constants/colors';
import { clearShopCache } from '../services/appointments';
import ReviewsScreen from './ReviewsScreen';

interface ShopInfo {
  id: number; name: string; category?: string; city?: string;
  district?: string; address?: string; phone?: string; description?: string;
}

export default function SettingsScreen() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const [form, setForm] = useState<Partial<ShopInfo>>({});

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? '');

      const [{ data: shops }, { data: profile }] = await Promise.all([
        supabase.from('shops').select('id, name, category, city, district, address, phone, description').eq('owner_id', session.user.id).limit(1),
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
      ]);

      if (shops?.length) {
        setShop(shops[0]);
        setForm(shops[0]);
      }
      setOwnerName(profile?.full_name ?? '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveShop = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shops').update({
        name: form.name, category: form.category, city: form.city,
        district: form.district, address: form.address, phone: form.phone, description: form.description,
      }).eq('id', shop.id);
      if (error) throw error;
      clearShopCache();
      setShop({ ...shop, ...form } as ShopInfo);
      setEditMode(false);
      Alert.alert('Kaydedildi', 'İşletme bilgileri güncellendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
          clearShopCache();
          await supabase.auth.signOut();
        }
      },
    ]);
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Ayarlar</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {ownerName ? ownerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{ownerName || 'İşletme Sahibi'}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
        </View>

        {/* Shop info */}
        {shop && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>İşletme Bilgileri</Text>
              {!editMode ? (
                <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>✏️ Düzenle</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => { setEditMode(false); setForm(shop); }} style={styles.editBtn}>
                  <Text style={[styles.editBtnText, { color: '#94a3b8' }]}>Vazgeç</Text>
                </TouchableOpacity>
              )}
            </View>

            {editMode ? (
              <View style={styles.formCard}>
                <FormField label="İşletme Adı" value={form.name ?? ''} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
                <FormField label="Kategori" value={form.category ?? ''} onChangeText={v => setForm(f => ({ ...f, category: v }))} />
                <FormField label="Şehir" value={form.city ?? ''} onChangeText={v => setForm(f => ({ ...f, city: v }))} />
                <FormField label="İlçe" value={form.district ?? ''} onChangeText={v => setForm(f => ({ ...f, district: v }))} />
                <FormField label="Adres" value={form.address ?? ''} onChangeText={v => setForm(f => ({ ...f, address: v }))} multiline />
                <FormField label="Telefon" value={form.phone ?? ''} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                <FormField label="Açıklama" value={form.description ?? ''} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />

                <TouchableOpacity style={styles.saveBtn} onPress={saveShop} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.infoCard}>
                <InfoRow label="İşletme Adı" value={shop.name} />
                {shop.category && <InfoRow label="Kategori" value={shop.category} />}
                {shop.city && <InfoRow label="Şehir" value={[shop.city, shop.district].filter(Boolean).join(' / ')} />}
                {shop.address && <InfoRow label="Adres" value={shop.address} />}
                {shop.phone && <InfoRow label="Telefon" value={shop.phone} />}
                {shop.description && <InfoRow label="Açıklama" value={shop.description} />}
              </View>
            )}
          </View>
        )}

        {/* Reviews shortcut */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setShowReviews(true)}>
          <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="star" size={18} color="#f59e0b" />
          </View>
          <Text style={styles.menuLabel}>Yorumlar</Text>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Versiyon" value="1.0.0" />
            <InfoRow label="Platform" value="Randezy İşletme" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Reviews full-screen overlay */}
      {showReviews && (
        <View style={StyleSheet.absoluteFillObject}>
          <ReviewsScreen />
          <TouchableOpacity style={styles.overlayBackBtn} onPress={() => setShowReviews(false)}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
            <Text style={styles.overlayBackText}>Geri</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function FormField({
  label, value, onChangeText, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#94a3b8"
        placeholder={label}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#0f172a',
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: '500', flex: 1 },
  value: { fontSize: 13, color: '#0f172a', fontWeight: '600', flex: 2, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 50 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 20, fontWeight: '800', color: BRAND },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  profileEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  editBtn: { backgroundColor: BRAND_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: BRAND },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  saveBtn: {
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff',
    marginTop: 8,
  },
  logoutBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  overlayBackBtn: {
    position: 'absolute', top: 52, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  overlayBackText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});
