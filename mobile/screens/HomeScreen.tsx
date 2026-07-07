import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Linking, Share, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { toDateStr } from '../utils/date';

// ─── design tokens ───────────────────────────────────────────
const PRIMARY  = '#5B5BF7';
const INK      = '#0F1024';
const INK_2    = '#3A3C5A';
const MUTED    = '#8A8DA8';
const BG       = '#F4F4F9';
const CARD     = '#FFFFFF';
const HAIR     = 'rgba(15,16,36,0.07)';
const OK       = '#1BB76E';
const WARN     = '#F5A524';
const ROSE     = '#F06A8B';
const SKY      = '#3EA0F5';
const HERO_BG  = '#4D4DEC';

const AVATAR_COLORS = ['#F2C2D2','#CFE6FF','#D7D7FF','#FFE0B8','#C9F0DC','#FFD2D9','#E1DBFF','#B8EAD8'];
const DAY_LABELS    = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const avatarBg  = (id: string) => AVATAR_COLORS[strHash(id) % AVATAR_COLORS.length];
const initials  = (name: string) => name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
const fmtTL     = (n: number) => '₺' + n.toLocaleString('tr-TR');

// ─── types ───────────────────────────────────────────────────
type DbApt = {
  id: string;
  appointment_time: string;
  service_name: string;
  status: string;
  price: number | null;
  duration_snapshot: number | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  profiles?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
};
type DispStatus = 'done' | 'cancelled' | 'noShow' | 'now' | 'overdue' | 'confirmed' | 'pending';
type AptDisplay = DbApt & { dispStatus: DispStatus };

const STATUS_META: Record<DispStatus, { c: string; bg: string; label: string }> = {
  done:      { c: OK,      bg: 'rgba(27,183,110,0.10)',  label: 'Tamamlandı'    },
  cancelled: { c: ROSE,    bg: 'rgba(240,106,139,0.12)', label: 'İptal Edildi'  },
  noShow:    { c: MUTED,   bg: 'rgba(138,141,168,0.14)', label: 'Gelmedi'       },
  now:       { c: PRIMARY, bg: 'rgba(91,91,247,0.12)',   label: 'Devam ediyor'  },
  overdue:   { c: WARN,    bg: 'rgba(245,165,36,0.14)',  label: 'Onay Bekliyor' },
  confirmed: { c: SKY,     bg: 'rgba(62,160,245,0.12)',  label: 'Onaylı'        },
  pending:   { c: WARN,    bg: 'rgba(245,165,36,0.14)',  label: 'Bekleyen'      },
};

// Onaylanmış bir randevunun saati geçtiyse owner'dan ayrıca "Geldi/Tamamla"
// onayı istemiyoruz — varsayılan "Tamamlandı" sayılır, müşteri gelmediyse
// "Gelmedi" ile elle işaretlenir. Hâlâ "Beklemede" (hiç onaylanmamış) olup
// saati geçen randevular ise sessizce "Tamamlandı" sayılmaz, dikkat çekmesi
// için "Onay Bekliyor" durumunda kalır.
function computeDispStatus(apt: DbApt): DispStatus {
  if (apt.status === 'Tamamlandı') return 'done';
  if (apt.status === 'İptal Edildi') return 'cancelled';
  if (apt.status === 'Gelmedi') return 'noShow';
  const now = new Date();
  const [h, m] = apt.appointment_time.split(':').map(Number);
  const start = new Date(); start.setHours(h, m, 0, 0);
  const end   = new Date(start.getTime() + (apt.duration_snapshot || 30) * 60000);
  if (now >= start && now <= end) return 'now';
  if (now > end) return apt.status === 'Onaylandı' ? 'done' : 'overdue';
  if (apt.status === 'Beklemede') return 'pending';
  return 'confirmed';
}

// ─── sub-components ──────────────────────────────────────────
function Avatar({ name, userId, size = 40 }: { name: string; userId: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: avatarBg(userId), alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color: '#2A1D4A' }}>{initials(name)}</Text>
    </View>
  );
}

function HomeHeader({ ownerName, shopName, onGoCalendar, onGoSettings }: { ownerName: string; shopName: string; onGoCalendar: () => void; onGoSettings: () => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 13, color: MUTED, fontWeight: '500' }}>{greeting} 👋</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: INK, marginTop: 2, letterSpacing: -0.4 }}>{ownerName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>R</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: INK_2, fontWeight: '600' }}>{shopName}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <TouchableOpacity style={styles.iconBtn} onPress={onGoCalendar}>
          <Feather name="search" size={20} color={INK} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onGoSettings}>
          <Feather name="bell" size={20} color={INK} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TodayHero({ revenue, doneCount, totalCount, siradaCount }: { revenue: number; doneCount: number; totalCount: number; siradaCount: number }) {
  const d = new Date();
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const dateLabel = `${d.getDate()} ${months[d.getMonth()]} ${DAY_LABELS[d.getDay()]}`;
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 24, backgroundColor: HERO_BG, padding: 18, overflow: 'hidden', shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
      <View style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <View style={{ position: 'absolute', left: -30, bottom: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 }}>BUGÜN · {dateLabel}</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#fff' }}>Randezy</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
        <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1, lineHeight: 46 }}>{fmtTL(revenue)}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 6 }}>bugünkü gelir</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        {[{ n: totalCount, l: 'Randevu' }, { n: doneCount, l: 'Tamamlandı' }, { n: siradaCount, l: 'Sırada' }].map((s, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>{s.n}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 3 }}>{s.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function NextUpCard({ apt, onStatusChange }: { apt: AptDisplay; onStatusChange: (id: string, status: string) => void }) {
  const isNow     = apt.dispStatus === 'now';
  const isPending = apt.dispStatus === 'pending';
  const isOverdue = apt.dispStatus === 'overdue';
  const name      = apt.guest_name || apt.profiles?.full_name || apt.profiles?.email || 'Misafir';
  const phone     = apt.guest_phone || apt.profiles?.phone;

  const confirm = () =>
    Alert.alert('Randevuyu onayla', `${name} için randevuyu onaylıyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: () => onStatusChange(apt.id, 'Onaylandı') },
    ]);

  const cancelPending = () =>
    Alert.alert('Randevuyu iptal et', `${name} için randevu iptal edilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: () => onStatusChange(apt.id, 'İptal Edildi') },
    ]);

  const markNoShow = () =>
    Alert.alert('Müşteri gelmedi', `${name} randevusuna gelmedi olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Gelmedi', style: 'destructive', onPress: () => onStatusChange(apt.id, 'Gelmedi') },
    ]);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: HAIR, shadowColor: INK, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: isNow ? 'rgba(27,183,110,0.12)' : (isPending || isOverdue) ? 'rgba(245,165,36,0.14)' : 'rgba(91,91,247,0.10)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isNow ? OK : (isPending || isOverdue) ? WARN : PRIMARY }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: isNow ? OK : (isPending || isOverdue) ? WARN : PRIMARY, letterSpacing: 0.2 }}>{isNow ? 'ŞİMDİ' : isPending ? 'BEKLİYOR' : isOverdue ? 'ONAY BEKLİYOR' : 'SIRADAKİ'}</Text>
          </View>
          <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{apt.appointment_time.slice(0, 5)} · {apt.duration_snapshot || 30} dk</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: INK }}>{fmtTL(apt.price ?? 0)}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} userId={apt.id} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: INK, letterSpacing: -0.2 }} numberOfLines={1}>{name}</Text>
          <Text style={{ fontSize: 13, color: INK_2, marginTop: 2 }} numberOfLines={1}>{apt.service_name}</Text>
        </View>
      </View>

      {/* Contact buttons */}
      {phone ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 }}>
          <TouchableOpacity style={[styles.softBtn, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Feather name="phone" size={15} color={INK} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: INK, marginLeft: 5 }}>Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.softBtn, { flex: 1 }]} onPress={() => Linking.openURL(`sms:${phone}`)}>
            <Feather name="message-circle" size={15} color={INK} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: INK, marginLeft: 5 }}>Mesaj</Text>
          </TouchableOpacity>
        </View>
      ) : <View style={{ marginTop: 12 }} />}

      {/* Action buttons */}
      {isPending ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.softBtn, { flex: 1, backgroundColor: 'rgba(245,165,36,0.10)', borderColor: 'rgba(245,165,36,0.3)' }]}
            onPress={cancelPending}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: WARN }}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.softBtn, { flex: 2, backgroundColor: PRIMARY, borderWidth: 0, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }]}
            onPress={confirm}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 6 }}>Onayla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.softBtn, { flex: 1, backgroundColor: 'rgba(240,106,139,0.10)', borderColor: 'rgba(240,106,139,0.3)' }]}
            onPress={markNoShow}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: ROSE }}>Gelmedi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function QuickActions({ onGoFinans, onGoKampanya }: { onGoFinans: () => void; onGoKampanya: () => void }) {
  const handleShare = async () => {
    await Share.share({ message: 'Randezy ile kolayca randevu alın: https://randezy.com' });
  };

  const items = [
    { icon: 'star'        as const, label: 'Kampanya', color: WARN,    bg: 'rgba(245,165,36,0.14)', onPress: onGoKampanya },
    { icon: 'share-2'     as const, label: 'Paylaş',   color: OK,      bg: 'rgba(27,183,110,0.12)', onPress: handleShare  },
    { icon: 'dollar-sign' as const, label: 'Finans',   color: PRIMARY, bg: 'rgba(91,91,247,0.10)',  onPress: onGoFinans   },
  ];
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, flexDirection: 'row', gap: 10 }}>
      {items.map((it, i) => (
        <TouchableOpacity key={i} onPress={it.onPress} style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, paddingVertical: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: HAIR, shadowColor: INK, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: it.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={it.icon} size={18} color={it.color} />
          </View>
          <Text style={{ fontSize: 12, color: INK, fontWeight: '600' }}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionHeader({ title, subtle, action, onAction }: { title: string; subtle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 10 }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: INK, letterSpacing: -0.3 }}>{title}</Text>
        {subtle && <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500', marginTop: 2 }}>{subtle}</Text>}
      </View>
      {action && <TouchableOpacity onPress={onAction}><Text style={{ color: PRIMARY, fontWeight: '600', fontSize: 13 }}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

function ScheduleTimeline({ items, onPress }: { items: AptDisplay[]; onPress?: () => void }) {
  if (!items.length) return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: CARD, borderRadius: 22, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: HAIR }}>
      <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: INK_2 }}>Bugün randevu yok</Text>
      <Text style={{ fontSize: 13, color: MUTED, marginTop: 4, textAlign: 'center' }}>Müşteriler randevu aldığında burada görünür</Text>
    </View>
  );
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: CARD, borderRadius: 22, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, borderWidth: 1, borderColor: HAIR, shadowColor: INK, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      {items.map((a, i) => {
        const meta = STATUS_META[a.dispStatus];
        // "overdue" bilerek dim'lenmiyor — henüz kapatılmamış, dikkat ister.
        const dim  = a.dispStatus === 'done' || a.dispStatus === 'cancelled' || a.dispStatus === 'noShow';
        const name = a.guest_name || a.profiles?.full_name || a.profiles?.email || 'Misafir';
        return (
          <TouchableOpacity key={a.id} onPress={onPress} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: 'rgba(15,16,36,0.05)', opacity: dim ? 0.5 : 1 }}>
            <View style={{ width: 46, alignItems: 'flex-start', paddingTop: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK, letterSpacing: -0.2 }}>{a.appointment_time.slice(0, 5)}</Text>
              <Text style={{ fontSize: 11, color: MUTED, fontWeight: '500', marginTop: 1 }}>{a.duration_snapshot || 30}dk</Text>
            </View>
            <View style={{ width: 4, borderRadius: 4, backgroundColor: meta.c, flexShrink: 0, alignSelf: 'stretch' }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={name} userId={a.id} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: INK, letterSpacing: -0.2 }} numberOfLines={1}>{name}</Text>
                <Text style={{ fontSize: 12.5, color: INK_2, marginTop: 1 }} numberOfLines={1}>{a.service_name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: INK }}>{fmtTL(a.price ?? 0)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: meta.bg }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: meta.c, letterSpacing: 0.2 }}>{meta.label}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function WeekChart({ data }: { data: { d: string; v: number; today: boolean }[] }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: CARD, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: HAIR, shadowColor: INK, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600', letterSpacing: 0.2, marginBottom: 4 }}>BU HAFTA</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: INK, marginBottom: 16 }}>Randevu dağılımı</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {data.map((w, i) => {
          const barH = Math.max(4, Math.round(w.v * 64));
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ height: 84, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                {w.today && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
                    <View style={{ backgroundColor: INK, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Bugün</Text>
                    </View>
                  </View>
                )}
                <View style={{ width: '100%', height: barH, backgroundColor: w.today ? PRIMARY : 'rgba(91,91,247,0.18)', borderRadius: 6 }} />
              </View>
              <Text style={{ fontSize: 11, color: w.today ? INK : MUTED, fontWeight: w.today ? '700' : '500' }}>{w.d}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function InsightsRow({ score }: { score: number | null }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 24, flexDirection: 'row', gap: 10 }}>
      {[
        { icon: 'user'       as const, label: 'Profil',   value: 'Tam',   sub: 'hesabınız',  color: PRIMARY, bg: 'rgba(91,91,247,0.10)' },
        { icon: 'zap'        as const, label: 'Aktif',    value: 'Açık',  sub: 'işletmeniz', color: OK,      bg: 'rgba(27,183,110,0.10)' },
        { icon: 'star'       as const, label: 'Puan',     value: score ? score.toFixed(1) : '—', sub: 'ortalama', color: WARN, bg: 'rgba(245,165,36,0.14)' },
      ].map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: HAIR, shadowColor: INK, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
          <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={c.icon} size={14} color={c.color} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: INK, marginTop: 8, letterSpacing: -0.4 }}>{c.value}</Text>
          <Text style={{ fontSize: 11.5, color: INK_2, fontWeight: '600', marginTop: 4 }}>{c.label}</Text>
          <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{c.sub}</Text>
        </View>
      ))}
    </View>
  );
}

function PromoCard({ onSend }: { onSend: () => void }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 22, padding: 16, overflow: 'hidden', backgroundColor: '#0F1024', shadowColor: INK, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
      <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,179,99,0.28)' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,179,99,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start', marginBottom: 8 }}>
            <Feather name="zap" size={10} color="#FFB363" />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#FFB363', letterSpacing: 0.3 }}> ÖNERİ</Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 }}>Boş slot var</Text>
          <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 3, lineHeight: 18 }}>Müşterilere özel kampanya göndererek doluluk oranını artır.</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }} onPress={onSend}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [ownerName, setOwnerName]   = useState('');
  const [shopName, setShopName]     = useState('');
  const [shopScore, setShopScore]   = useState<number | null>(null);
  const [todayApts, setTodayApts]   = useState<AptDisplay[]>([]);
  const [weekData, setWeekData]     = useState<{ d: string; v: number; today: boolean }[]>([]);
  const [revenue, setRevenue]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const goCalendar   = () => navigation.navigate('Takvim');
  const goSettings   = () => navigation.navigate('Profil');
  const goFinans     = () => navigation.navigate('Finans');
  const goKampanya   = () => navigation.navigate('Isletme', { initialTab: 'campaigns' });

  const handleStatusChange = useCallback(async (aptId: string, newStatus: string) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', aptId);
    setTodayApts(prev => prev.map(a => {
      if (a.id !== aptId) return a;
      const updated = { ...a, status: newStatus };
      return { ...updated, dispStatus: computeDispStatus(updated) };
    }));
    if (newStatus === 'Tamamlandı') {
      setRevenue(prev => {
        const apt = todayApts.find(a => a.id === aptId);
        return prev + (apt?.price ?? 0);
      });
    }
  }, [todayApts]);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: shops }, { data: profile }] = await Promise.all([
        supabase.from('shops').select('id, name, score').eq('owner_id', session.user.id).limit(1),
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
      ]);
      if (!shops?.length) return;

      const shop = shops[0];
      setShopName(shop.name ?? '');
      setShopScore(shop.score ?? null);
      setOwnerName(profile?.full_name?.split(' ')[0] ?? 'Hoş geldiniz');

      const today = toDateStr(new Date());

      // week dates (Mon–Sun of current week, or last 7 days)
      const now = new Date();
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return toDateStr(d);
      });

      const [{ data: todayRaw }, { data: weekRaw }] = await Promise.all([
        supabase.from('appointments').select('*, profiles(full_name, phone)').eq('shop_id', shop.id).eq('appointment_date', today).order('appointment_time', { ascending: true }),
        supabase.from('appointments').select('appointment_date').eq('shop_id', shop.id).gte('appointment_date', weekDates[0]).lte('appointment_date', weekDates[6]),
      ]);

      const aptList = (todayRaw || []) as DbApt[];
      const displayed: AptDisplay[] = aptList.map(a => ({ ...a, dispStatus: computeDispStatus(a) }));
      setTodayApts(displayed);
      setRevenue(
        displayed
          .filter(a => a.dispStatus === 'done')
          .reduce((s, a) => s + (a.price ?? 0), 0)
      );

      // Onaylanmış + saati geçmiş randevular dispStatus'ta 'done' sayılıyor;
      // Finans ve diğer ekranlarla tutarlı kalması için DB'ye de yazıyoruz.
      const autoCompleteIds = displayed
        .filter(a => a.status === 'Onaylandı' && a.dispStatus === 'done')
        .map(a => a.id);
      if (autoCompleteIds.length) {
        supabase.from('appointments').update({ status: 'Tamamlandı' }).in('id', autoCompleteIds);
      }

      // build week chart
      const counts = weekDates.map(date => (weekRaw || []).filter((a: any) => a.appointment_date === date).length);
      const maxCount = Math.max(1, ...counts);
      setWeekData(weekDates.map((date, i) => ({
        d: DAY_LABELS[new Date(date + 'T12:00:00').getDay()],
        v: counts[i] / maxCount,
        today: date === today,
      })));

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const doneCount   = todayApts.filter(a => a.dispStatus === 'done').length;
  const siradaCount = todayApts.filter(a => a.dispStatus === 'now' || a.dispStatus === 'overdue' || a.dispStatus === 'confirmed' || a.dispStatus === 'pending').length;
  const nextUp      = todayApts.find(a => a.dispStatus === 'now') ?? todayApts.find(a => a.dispStatus === 'overdue') ?? todayApts.find(a => a.dispStatus === 'confirmed' || a.dispStatus === 'pending');
  const hasEmpty    = todayApts.length > 0 && siradaCount === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        <HomeHeader ownerName={ownerName} shopName={shopName} onGoCalendar={goCalendar} onGoSettings={goSettings} />
        <TodayHero revenue={revenue} doneCount={doneCount} totalCount={todayApts.length} siradaCount={siradaCount} />
        {nextUp && <NextUpCard apt={nextUp} onStatusChange={handleStatusChange} />}
        <QuickActions onGoFinans={goFinans} onGoKampanya={goKampanya} />

        <SectionHeader
          title="Bugünün programı"
          subtle={`${todayApts.length} randevu · ${siradaCount} sırada`}
          action="Tümü"
          onAction={goCalendar}
        />
        <ScheduleTimeline items={todayApts} onPress={goCalendar} />

        {hasEmpty && <PromoCard onSend={goKampanya} />}

        <SectionHeader title="Performans" subtle="Bu haftaki dağılım" action="Detay" onAction={goFinans} />
        {weekData.length > 0 && <WeekChart data={weekData} />}
        <InsightsRow score={shopScore} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: HAIR,
    shadowColor: INK, shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  softBtn: {
    height: 40, borderRadius: 12, borderWidth: 1, borderColor: HAIR,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
});
