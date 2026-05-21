import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking, TextInput,
} from 'react-native';
import { Appointment, AppointmentStatus } from '../../types/appointment';
import { STATUS_CONFIG, BRAND } from '../../constants/colors';
import { formatTime } from '../../utils/time';
import { parseDateStr, formatDateTR, toDateStr, addDays } from '../../utils/date';
import { useAppointments } from '../../contexts/AppointmentsContext';

interface Props {
  apt: Appointment | null;
  onClose: () => void;
}

export default function AppointmentDetailsModal({ apt, onClose }: Props) {
  const { doUpdateStatus, doReschedule } = useAppointments();
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  if (!apt) return null;

  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['Beklemede'];
  const customerName = apt.profiles?.full_name || apt.profiles?.email || 'Misafir';
  const aptDate = parseDateStr(apt.appointment_date);

  const act = async (status: AppointmentStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await doUpdateStatus(apt.id, status);
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Güncelleme başarısız');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert('Randevuyu İptal Et', `${customerName} için randevuyu iptal etmek istediğinizden emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: () => act('İptal Edildi') },
    ]);
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert('Hata', 'Tarih ve saat giriniz');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rescheduleDate)) {
      Alert.alert('Hata', 'Tarih formatı: YYYY-AA-GG');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(rescheduleTime)) {
      Alert.alert('Hata', 'Saat formatı: SS:DD');
      return;
    }
    setBusy(true);
    try {
      await doReschedule(apt.id, rescheduleDate, rescheduleTime);
      setRescheduling(false);
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Yeniden planlama başarısız');
    } finally {
      setBusy(false);
    }
  };

  const callCustomer = () => {
    const phone = apt.profiles?.phone;
    if (!phone) { Alert.alert('Telefon yok', 'Müşteri telefon numarası kayıtlı değil.'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Modal visible={!!apt} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.serviceName}>{apt.service_name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Text style={[styles.statusText, { color: cfg.text }]}>{apt.status}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsCard}>
            <DetailRow label="Tarih" value={formatDateTR(aptDate)} />
            <DetailRow label="Saat" value={formatTime(apt.appointment_time)} />
            <DetailRow label="Süre" value={`${apt.duration_minutes} dk`} />
            {apt.price > 0 && <DetailRow label="Ücret" value={`₺${apt.price}`} />}
            {apt.profiles?.phone && <DetailRow label="Telefon" value={apt.profiles.phone} />}
            {apt.profiles?.email && <DetailRow label="E-posta" value={apt.profiles.email} />}
            {apt.cancel_reason && <DetailRow label="İptal Sebebi" value={apt.cancel_reason} />}
          </View>

          {/* Reschedule form */}
          {rescheduling && (
            <View style={styles.rescheduleCard}>
              <Text style={styles.rescheduleTitle}>Yeniden Planla</Text>
              <TextInput
                style={styles.input}
                placeholder="Tarih (YYYY-AA-GG)"
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Saat (SS:DD)"
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
                keyboardType="numeric"
                maxLength={5}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={handleReschedule}
                  disabled={busy}
                >
                  <Text style={styles.btnPrimaryText}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost, { flex: 1 }]}
                  onPress={() => setRescheduling(false)}
                >
                  <Text style={styles.btnGhostText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actions */}
          {!rescheduling && (
            <View style={styles.actions}>
              {apt.status === 'Beklemede' && (
                <ActionBtn label="✓  Onayla" color="#16a34a" bg="#dcfce7" onPress={() => act('Onaylandı')} disabled={busy} />
              )}
              {(apt.status === 'Onaylandı' || apt.status === 'Beklemede') && (
                <ActionBtn label="✓  Tamamlandı" color="#6366f1" bg="#e0e7ff" onPress={() => act('Tamamlandı')} disabled={busy} />
              )}
              {(apt.status === 'Onaylandı' || apt.status === 'Beklemede') && (
                <ActionBtn label="✗  Gelmedi" color="#e11d48" bg="#fff1f2" onPress={() => act('Gelmedi')} disabled={busy} />
              )}
              {apt.status !== 'İptal Edildi' && apt.status !== 'Tamamlandı' && (
                <ActionBtn label="↺  Yeniden Planla" color="#0369a1" bg="#e0f2fe" onPress={() => {
                  setRescheduleDate(apt.appointment_date);
                  setRescheduleTime(formatTime(apt.appointment_time));
                  setRescheduling(true);
                }} disabled={busy} />
              )}
              {apt.status !== 'İptal Edildi' && apt.status !== 'Tamamlandı' && (
                <ActionBtn label="✕  İptal Et" color="#dc2626" bg="#fee2e2" onPress={confirmCancel} disabled={busy} />
              )}
              <ActionBtn label="📞  Müşteriyi Ara" color="#0f172a" bg="#f8fafc" onPress={callCustomer} disabled={false} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, color, bg, onPress, disabled }: {
  label: string; color: string; bg: string;
  onPress: () => void; disabled: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionBtn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  value: { fontSize: 13, color: '#1e293b', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  customerName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  serviceName: { fontSize: 14, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailsCard: { backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 14, marginBottom: 16 },
  rescheduleCard: { backgroundColor: '#f0f9ff', borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 },
  rescheduleTitle: { fontSize: 14, fontWeight: '700', color: '#0369a1' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  row: { flexDirection: 'row', gap: 10 },
  actions: { gap: 8, marginBottom: 8 },
  actionBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: BRAND },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnGhostText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  closeBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 14, backgroundColor: '#f8fafc', borderRadius: 14 },
  closeBtnText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
