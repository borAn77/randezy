import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking, TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appointment, AppointmentStatus } from '../../types/appointment';
import { BRAND, CATEGORY_COLORS, getCategoryForService } from '../../constants/colors';
import { formatTime } from '../../utils/time';
import { parseDateStr, formatDateTR, toDateStr } from '../../utils/date';
import { useAppointments } from '../../contexts/AppointmentsContext';

interface Props { apt: Appointment | null; onClose: () => void }

export default function AppointmentDetailsModal({ apt, onClose }: Props) {
  const { doUpdateStatus, doReschedule, doDelete } = useAppointments();
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  if (!apt) return null;

  const cc = CATEGORY_COLORS[getCategoryForService(apt.service_name)];
  const customerName = apt.profiles?.full_name || apt.profiles?.email || 'Misafir';
  const initials = customerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const phone = apt.profiles?.phone;
  const aptDate = parseDateStr(apt.appointment_date);
  const staffName = apt.staff
    ? `${apt.staff.first_name ?? ''} ${apt.staff.last_name ?? ''}`.trim()
    : null;

  const endMin = parseInt(apt.appointment_time.split(':')[0]) * 60
    + parseInt(apt.appointment_time.split(':')[1]) + apt.duration_minutes;
  const endStr = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`;
  const durationMins = endMin - parseInt(apt.appointment_time.split(':')[0]) * 60
    - parseInt(apt.appointment_time.split(':')[1]);

  const act = async (status: AppointmentStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await Haptics.notificationAsync(
        status === 'Onaylandı' || status === 'Tamamlandı'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      await doUpdateStatus(apt.id, status);
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Güncelleme başarısız');
    } finally { setBusy(false); }
  };

  const confirmDelete = () => Alert.alert(
    'Randevuyu Sil',
    'Bu randevu kalıcı olarak silinecek. Emin misiniz?',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await doDelete(apt.id);
          onClose();
        }
      },
    ]
  );

  const callCustomer = () => {
    if (!phone) { Alert.alert('Telefon yok', 'Müşteri telefon numarası kayıtlı değil.'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = () => {
    if (!phone) { Alert.alert('Telefon yok', 'Müşteri telefon numarası kayıtlı değil.'); return; }
    const num = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Merhaba ${customerName}, randevunuz hakkında bilgi vermek istedim.`);
    Linking.openURL(`whatsapp://send?phone=+90${num}&text=${msg}`).catch(() => {
      Alert.alert('WhatsApp yüklü değil');
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) { Alert.alert('Hata', 'Tarih ve saat giriniz'); return; }
    setBusy(true);
    try {
      await doReschedule(apt.id, rescheduleDate, rescheduleTime);
      setRescheduling(false); onClose();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'İşlem başarısız');
    } finally { setBusy(false); }
  };

  // Status action buttons
  const StatusButton = ({
    value, label, icon, palette,
  }: {
    value: AppointmentStatus;
    label: string;
    icon: string;
    palette: { bg: string; edge: string; fg: string };
  }) => {
    const active = apt.status === value;
    return (
      <TouchableOpacity
        onPress={() => act(value)}
        disabled={busy}
        style={[
          styles.statusBtn,
          active
            ? { backgroundColor: palette.bg, borderColor: palette.edge }
            : { backgroundColor: '#fff', borderColor: '#e2e8f0' },
        ]}
        activeOpacity={0.75}
      >
        <Text style={styles.statusBtnIcon}>{icon}</Text>
        <Text style={[styles.statusBtnLabel, { color: active ? palette.fg : '#64748b' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={!!apt} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Hero */}
          <View style={[styles.hero, { backgroundColor: cc.bg }]}>
            <View style={[styles.heroEdge, { backgroundColor: cc.edge }]} />
            <View style={styles.heroContent}>
              <Text style={[styles.heroDate, { color: cc.text }]}>
                {formatDateTR(aptDate)}
              </Text>
              <Text style={[styles.heroTime, { color: cc.text }]}>
                {formatTime(apt.appointment_time)} – {endStr}
              </Text>
              <Text style={[styles.heroDuration, { color: cc.text }]}>
                {apt.duration_minutes} dakika
              </Text>
            </View>
          </View>

          {/* Customer */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MÜŞTERİ</Text>
            <View style={styles.customerRow}>
              <View style={[styles.avatar, { backgroundColor: cc.bg }]}>
                <Text style={[styles.avatarText, { color: cc.text }]}>{initials}</Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
                {phone && <Text style={styles.customerPhone}>{phone}</Text>}
              </View>
              {phone && (
                <View style={styles.contactBtns}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: cc.bg }]}
                    onPress={callCustomer}
                  >
                    <Text style={styles.contactBtnIcon}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: cc.bg }]}
                    onPress={openWhatsApp}
                  >
                    <Text style={styles.contactBtnIcon}>💬</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Service */}
          <View style={styles.infoBlock}>
            <View style={styles.infoBlockLeft}>
              <Text style={styles.infoBlockLabel}>HİZMET</Text>
              <Text style={styles.infoBlockValue}>{apt.service_name}</Text>
              <Text style={styles.infoBlockSub}>{apt.duration_minutes} dk</Text>
            </View>
            {apt.price > 0 && (
              <View style={styles.infoBlockRight}>
                <Text style={styles.infoBlockLabel}>TUTAR</Text>
                <Text style={styles.infoBlockPrice}>{apt.price}<Text style={styles.priceUnit}>₺</Text></Text>
              </View>
            )}
          </View>

          {/* Staff */}
          {staffName && (
            <View style={styles.staffBlock}>
              <View style={[styles.staffAvatar, { backgroundColor: cc.bg }]}>
                <Text style={[styles.staffInitial, { color: cc.text }]}>
                  {staffName.split(' ').map((p: string) => p[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View>
                <Text style={styles.staffBlockLabel}>ÇALIŞAN</Text>
                <Text style={styles.staffBlockName}>{staffName}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {apt.cancel_reason && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>NOT</Text>
              <Text style={styles.noteText}>{apt.cancel_reason}</Text>
            </View>
          )}

          {/* Status update */}
          {!rescheduling && (
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>DURUMU GÜNCELLE</Text>
              <View style={styles.statusBtnRow}>
                <StatusButton
                  value="Tamamlandı"
                  label="Geldi"
                  icon="✓"
                  palette={{ bg: '#E7F6EF', edge: '#10B981', fg: '#065F46' }}
                />
                <StatusButton
                  value="Gelmedi"
                  label="Gelmedi"
                  icon="—"
                  palette={{ bg: '#F2F2F4', edge: '#9CA3AF', fg: '#4B5563' }}
                />
                <StatusButton
                  value="İptal Edildi"
                  label="İptal"
                  icon="✕"
                  palette={{ bg: '#FCEDED', edge: '#EF4444', fg: '#991B1B' }}
                />
              </View>

              {apt.status === 'Beklemede' && (
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => act('Onaylandı')}
                  disabled={busy}
                >
                  <Text style={styles.confirmBtnText}>✓  Randevuyu Onayla</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Reschedule */}
          {rescheduling ? (
            <View style={styles.rescheduleCard}>
              <Text style={styles.rescheduleTitle}>🗓 Yeniden Planla</Text>
              <TextInput
                style={styles.input}
                placeholder="Tarih  YYYY-AA-GG"
                placeholderTextColor="#94a3b8"
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Saat  SS:DD"
                placeholderTextColor="#94a3b8"
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
                keyboardType="numeric"
                maxLength={5}
              />
              <View style={styles.twoCol}>
                <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={handleReschedule} disabled={busy}>
                  <Text style={styles.btnWhiteText}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setRescheduling(false)}>
                  <Text style={styles.btnGhostText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.outlineActions}>
              {apt.status !== 'İptal Edildi' && apt.status !== 'Tamamlandı' && (
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => {
                    setRescheduleDate(apt.appointment_date);
                    setRescheduleTime(formatTime(apt.appointment_time));
                    setRescheduling(true);
                  }}
                >
                  <Text style={styles.outlineBtnText}>↺  Yeniden Planla</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.outlineBtn, styles.outlineBtnDanger]} onPress={confirmDelete}>
                <Text style={styles.outlineBtnDangerText}>🗑  Sil</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: BRAND }]} onPress={onClose}>
          <Text style={styles.closeBtnText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,15,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },

  // Hero
  hero: {
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroEdge: { width: 4 },
  heroContent: { flex: 1, padding: 16 },
  heroDate: { fontSize: 11, letterSpacing: 0.4, opacity: 0.75 },
  heroTime: { fontSize: 24, fontWeight: '700', marginTop: 4, letterSpacing: -0.5 },
  heroDuration: { fontSize: 12, opacity: 0.75, marginTop: 2 },

  // Customer
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 10, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  customerPhone: { fontSize: 12.5, color: '#64748b', marginTop: 2 },
  contactBtns: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  contactBtnIcon: { fontSize: 18 },

  // Service block
  infoBlock: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoBlockLeft: { flex: 1 },
  infoBlockRight: { alignItems: 'flex-end' },
  infoBlockLabel: {
    fontSize: 10, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  },
  infoBlockValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  infoBlockSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  infoBlockPrice: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  priceUnit: { fontSize: 13, opacity: 0.6 },

  // Staff block
  staffBlock: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8ecf0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  staffAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  staffInitial: { fontSize: 12, fontWeight: '800' },
  staffBlockLabel: {
    fontSize: 10, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  staffBlockName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  // Note
  noteBlock: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noteLabel: {
    fontSize: 10, color: '#92400e',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  },
  noteText: { fontSize: 13, color: '#78350f', lineHeight: 20 },

  // Status buttons
  statusSection: { marginBottom: 12 },
  statusBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  statusBtnIcon: { fontSize: 18 },
  statusBtnLabel: { fontSize: 12.5, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Reschedule
  rescheduleCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  rescheduleTitle: { fontSize: 14, fontWeight: '800', color: '#1e40af' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnGreen: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnWhiteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhostText: { color: '#64748b', fontWeight: '700', fontSize: 14 },

  outlineActions: { gap: 8, marginBottom: 6 },
  outlineBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  outlineBtnText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  outlineBtnDanger: { borderColor: '#fca5a5' },
  outlineBtnDangerText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },

  closeBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
