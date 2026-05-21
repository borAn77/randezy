import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking, TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appointment, AppointmentStatus } from '../../types/appointment';
import { STATUS_CONFIG, BRAND } from '../../constants/colors';
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

  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
  const customerName = apt.profiles?.full_name || apt.profiles?.email || 'Misafir';
  const initials = customerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const phone = apt.profiles?.phone;
  const aptDate = parseDateStr(apt.appointment_date);
  const staffName = apt.staff ? `${apt.staff.first_name ?? ''} ${apt.staff.last_name ?? ''}`.trim() : null;

  const endMin = parseInt(apt.appointment_time.split(':')[0]) * 60
    + parseInt(apt.appointment_time.split(':')[1]) + apt.duration_minutes;
  const endStr = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  const act = async (status: AppointmentStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await Haptics.notificationAsync(
        status === 'Onaylandı' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
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

  const confirmCancel = () => Alert.alert(
    'Randevuyu Reddet',
    `${customerName} adlı müşterinin randevusunu reddetmek istediğinizden emin misiniz?`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Reddet', style: 'destructive', onPress: () => act('İptal Edildi') },
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

  return (
    <Modal visible={!!apt} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Customer header */}
          <View style={styles.customerHeader}>
            <View style={[styles.avatar, { backgroundColor: cfg.iconBg }]}>
              <Text style={[styles.avatarText, { color: cfg.text }]}>{initials}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              {phone && <Text style={styles.phoneText}>{phone}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Text style={[styles.statusText, { color: cfg.text }]}>{apt.status}</Text>
            </View>
          </View>

          {/* Call / WhatsApp */}
          {phone && (
            <View style={styles.contactRow}>
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#dcfce7' }]} onPress={callCustomer}>
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={[styles.contactBtnText, { color: '#15803d' }]}>Ara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#dcfce7' }]} onPress={openWhatsApp}>
                <Text style={styles.contactBtnIcon}>💬</Text>
                <Text style={[styles.contactBtnText, { color: '#15803d' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Detail card */}
          <View style={styles.detailCard}>
            <Row icon="📅" label="Tarih" value={formatDateTR(aptDate)} />
            <Row icon="🕐" label="Saat" value={`${formatTime(apt.appointment_time)} – ${endStr} (${apt.duration_minutes} dk)`} />
            <Row icon="✂️" label="Hizmet" value={apt.service_name} />
            {staffName && <Row icon="👤" label="Personel" value={staffName} />}
            {apt.price > 0 && <Row icon="💰" label="Ücret" value={`₺${apt.price}`} />}
            {apt.profiles?.email && <Row icon="✉️" label="E-posta" value={apt.profiles.email} />}
            {apt.cancel_reason && <Row icon="⚠️" label="Red Sebebi" value={apt.cancel_reason} />}
          </View>

          {/* Reschedule form */}
          {rescheduling && (
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
          )}

          {/* Action buttons */}
          {!rescheduling && (
            <View style={styles.actions}>
              {apt.status === 'Beklemede' && (
                <TouchableOpacity style={[styles.bigBtn, styles.bigBtnGreen]} onPress={() => act('Onaylandı')} disabled={busy}>
                  <Text style={styles.bigBtnIcon}>✓</Text>
                  <Text style={styles.bigBtnText}>Kabul Et</Text>
                </TouchableOpacity>
              )}
              {apt.status === 'Beklemede' && (
                <TouchableOpacity style={[styles.bigBtn, styles.bigBtnRed]} onPress={confirmCancel} disabled={busy}>
                  <Text style={styles.bigBtnIcon}>✕</Text>
                  <Text style={styles.bigBtnText}>Reddet</Text>
                </TouchableOpacity>
              )}
              {(apt.status === 'Onaylandı') && (
                <TouchableOpacity style={[styles.bigBtn, styles.bigBtnBlue]} onPress={() => act('Tamamlandı')} disabled={busy}>
                  <Text style={styles.bigBtnIcon}>✓✓</Text>
                  <Text style={styles.bigBtnText}>Tamamlandı</Text>
                </TouchableOpacity>
              )}
              {(apt.status === 'Onaylandı' || apt.status === 'Beklemede') && (
                <TouchableOpacity style={[styles.bigBtn, styles.bigBtnGray]} onPress={() => act('Gelmedi')} disabled={busy}>
                  <Text style={styles.bigBtnIcon}>—</Text>
                  <Text style={[styles.bigBtnText, { color: '#374151' }]}>Gelmedi</Text>
                </TouchableOpacity>
              )}
              {apt.status !== 'İptal Edildi' && apt.status !== 'Tamamlandı' && (
                <TouchableOpacity
                  style={[styles.outlineBtn]}
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

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  icon: { fontSize: 14, width: 24 },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: '500', flex: 1 },
  value: { fontSize: 13, color: '#0f172a', fontWeight: '600', flex: 2, textAlign: 'right' },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  phoneText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
  },
  contactBtnIcon: { fontSize: 16 },
  contactBtnText: { fontSize: 14, fontWeight: '700' },
  detailCard: { backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, marginBottom: 14 },
  rescheduleCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginBottom: 14, gap: 10 },
  rescheduleTitle: { fontSize: 14, fontWeight: '800', color: '#1e40af' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#0f172a',
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnGreen: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnWhiteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhostText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  actions: { gap: 9, marginBottom: 6 },
  bigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
  },
  bigBtnGreen: { backgroundColor: '#16a34a' },
  bigBtnRed: { backgroundColor: '#dc2626' },
  bigBtnBlue: { backgroundColor: '#2563eb' },
  bigBtnGray: { backgroundColor: '#f3f4f6' },
  bigBtnIcon: { color: '#fff', fontSize: 15, fontWeight: '900' },
  bigBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    paddingVertical: 13, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  outlineBtnText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  outlineBtnDanger: { borderColor: '#fca5a5' },
  outlineBtnDangerText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  closeBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 15, backgroundColor: '#f8fafc', borderRadius: 16 },
  closeBtnText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
