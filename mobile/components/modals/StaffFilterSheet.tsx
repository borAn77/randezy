import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { BRAND, BRAND_LIGHT } from '../../constants/colors';
import { useAppointments } from '../../contexts/AppointmentsContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (id: string | null) => void;
}

function Tick() {
  return (
    <View style={tickStyles.circle}>
      <Text style={tickStyles.check}>✓</Text>
    </View>
  );
}

const tickStyles = StyleSheet.create({
  circle: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

export default function StaffFilterSheet({ visible, onClose, value, onChange }: Props) {
  const { staff } = useAppointments();
  const isAll = value === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>Çalışan filtresi</Text>
        <Text style={styles.subtitle}>Takvimde göstermek istediğin çalışanı seç.</Text>

        {/* All staff option */}
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={[styles.row, isAll && styles.rowActive]}
          activeOpacity={0.8}
        >
          <View style={[styles.allAvatar, { backgroundColor: BRAND }]}>
            <Text style={styles.allAvatarText}>HEP</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.rowName}>Tüm çalışanlar</Text>
            <Text style={styles.rowRole}>{staff.length} kişi</Text>
          </View>
          {isAll && <Tick />}
        </TouchableOpacity>

        {/* Individual staff */}
        {staff.map(s => {
          const sel = value === s.id;
          const initials = `${s.first_name[0]}${s.last_name[0]}`;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => onChange(sel ? null : s.id)}
              style={[styles.row, sel && styles.rowActive]}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                {s.avatar_url
                  ? <Image source={{ uri: s.avatar_url }} style={styles.avatarImg} />
                  : <Text style={[styles.avatarInitials, sel && { color: BRAND }]}>{initials}</Text>
                }
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowName}>{s.first_name} {s.last_name}</Text>
              </View>
              {sel && <Tick />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
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
    maxHeight: '65%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8ecf0',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  rowActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  allAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  allAvatarText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarInitials: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  rowMid: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowRole: { fontSize: 12, color: '#64748b', marginTop: 1 },
  closeBtn: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#334155' },
});
