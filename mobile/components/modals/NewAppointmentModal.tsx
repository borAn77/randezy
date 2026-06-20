import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Platform, Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, BG, SURFACE, BORDER } from '../../constants/colors';
import { ServiceItem, StaffMember, CreateAppointmentParams } from '../../types/appointment';
import { toDateStr, formatDateTR } from '../../utils/date';
import DatePickerModal from './DatePickerModal';

// ─── tasarım sabitleri ────────────────────────────────────────
const INK    = '#0f172a';
const INK_2  = '#475569';
const MUTED  = '#94a3b8';
const HAIR   = '#e2e8f0';
const OK     = '#22c55e';
const DANGER = '#ef4444';

interface Props {
  visible: boolean;
  services: ServiceItem[];
  staff: StaffMember[];
  defaultDate?: Date;
  onClose: () => void;
  onSave: (params: CreateAppointmentParams) => Promise<void>;
}

function Section({ title }: { title: string }) {
  return (
    <Text style={styles.sectionLabel}>{title}</Text>
  );
}

export default function NewAppointmentModal({
  visible, services, staff, defaultDate, onClose, onSave,
}: Props) {
  const [guestName, setGuestName]     = useState('');
  const [guestPhone, setGuestPhone]   = useState('');
  const [selectedSvc, setSelectedSvc] = useState<ServiceItem | null>(null);
  const [date, setDate]               = useState<Date>(defaultDate ?? new Date());
  const [time, setTime]               = useState('09:00');
  const [staffId, setStaffId]         = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving]           = useState(false);

  const reset = () => {
    setGuestName('');
    setGuestPhone('');
    setSelectedSvc(null);
    setDate(defaultDate ?? new Date());
    setTime('09:00');
    setStaffId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateTime = (t: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);

  const handleSave = async () => {
    if (!guestName.trim()) {
      Alert.alert('Eksik bilgi', 'Müşteri adı zorunludur.');
      return;
    }
    if (!selectedSvc) {
      Alert.alert('Eksik bilgi', 'Lütfen bir hizmet seçin.');
      return;
    }
    if (!validateTime(time)) {
      Alert.alert('Hatalı saat', 'Saati SS:DD formatında girin. Örnek: 14:30');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        serviceName: selectedSvc.name,
        price: selectedSvc.price,
        duration: selectedSvc.duration,
        appointmentDate: toDateStr(date),
        appointmentTime: time.length === 4 ? '0' + time : time,
        staffId,
      });
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Randevu oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Başlık */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={INK_2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Yeni Randevu</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={styles.content}>

            {/* Müşteri */}
            <Section title="MÜŞTERİ BİLGİSİ" />
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Müşteri adı *"
                  placeholderTextColor={MUTED}
                  value={guestName}
                  onChangeText={setGuestName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: HAIR }]}>
                <Ionicons name="call-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon (opsiyonel)"
                  placeholderTextColor={MUTED}
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Hizmet */}
            <Section title="HİZMET *" />
            <View style={styles.card}>
              {services.length === 0 ? (
                <Text style={styles.emptyText}>Henüz hizmet eklenmemiş. İşletme → Hizmetler bölümünden ekleyin.</Text>
              ) : (
                services.map(svc => {
                  const selected = selectedSvc?.id === svc.id;
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[styles.svcRow, selected && styles.svcRowSelected]}
                      onPress={() => setSelectedSvc(svc)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.svcName, selected && styles.svcNameSelected]}>{svc.name}</Text>
                        <Text style={styles.svcMeta}>{svc.duration} dk · ₺{svc.price.toLocaleString('tr-TR')}</Text>
                      </View>
                      {selected && (
                        <View style={styles.svcBadge}>
                          <Text style={styles.svcBadgeText}>Seçildi</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Tarih & Saat */}
            <Section title="TARİH VE SAAT *" />
            <View style={styles.card}>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <Text style={[styles.input, { color: INK, paddingVertical: 14 }]}>
                  {formatDateTR(date)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
              <View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: HAIR }]}>
                <Ionicons name="time-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Saat (SS:DD)"
                  placeholderTextColor={MUTED}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Personel */}
            {staff.length > 0 && (
              <>
                <Section title="PERSONEL (OPSİYONEL)" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
                  <TouchableOpacity
                    style={[styles.staffChip, staffId === null && styles.staffChipSelected]}
                    onPress={() => setStaffId(null)}
                  >
                    <Text style={[styles.staffChipText, staffId === null && styles.staffChipTextSelected]}>Herhangi</Text>
                  </TouchableOpacity>
                  {staff.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.staffChip, staffId === s.id && styles.staffChipSelected]}
                      onPress={() => setStaffId(s.id)}
                    >
                      <Text style={[styles.staffChipText, staffId === s.id && styles.staffChipTextSelected]}>
                        {s.first_name} {s.last_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* Kaydet butonu */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Randevu Oluştur</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={date}
        onSelect={setDate}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: HAIR,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: INK,
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: 13,
    color: MUTED,
    padding: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: HAIR,
  },
  svcRowSelected: {
    backgroundColor: '#eef2ff',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: BRAND,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND,
  },
  svcName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: INK_2,
  },
  svcNameSelected: {
    color: INK,
    fontWeight: '700',
  },
  svcMeta: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  svcBadge: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  svcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  staffScroll: {
    marginBottom: 20,
    paddingLeft: 0,
  },
  staffChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    marginRight: 8,
  },
  staffChipSelected: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  staffChipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: INK_2,
  },
  staffChipTextSelected: {
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: HAIR,
  },
  saveBtn: {
    backgroundColor: BRAND,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BRAND,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
