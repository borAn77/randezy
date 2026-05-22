"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { supabase } from "../../lib/supabase";

// ── Supabase row type ─────────────────────────────────────────────────────────

type AptRow = {
  id: string;
  shop_id: string;
  appointment_date: string;   // "2026-05-25"
  appointment_time: string;   // "14:30:00"
  service_name: string;
  status: string;             // 'Beklemede' | 'Onaylandı' | 'İptal Edildi' | 'Tamamlandı'
  price: number;
  cancel_reason?: string | null;
  staff_name?: string | null;
  notes?: string | null;
  shops: { name: string; city: string; district: string } | null;
};

type TabKey = 'upcoming' | 'past' | 'cancelled';

function aptDateTime(apt: AptRow): Date {
  return new Date(`${apt.appointment_date}T${apt.appointment_time}`);
}

function classifyApt(apt: AptRow): TabKey {
  if (apt.status === 'İptal Edildi') return 'cancelled';
  if (apt.status === 'Tamamlandı') return 'past';
  return aptDateTime(apt).getTime() > Date.now() ? 'upcoming' : 'past';
}

// ── Visual helpers ─────────────────────────────────────────────────────────────

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

const PALETTE_HUES = [30, 65, 155, 200, 230, 265, 295, 340];
const PATTERN_KEYS = ['lines', 'crosshatch', 'dots', 'wave'] as const;
type PatternKey = typeof PATTERN_KEYS[number];

function bizHue(id: string) { return PALETTE_HUES[strHash(id) % PALETTE_HUES.length]; }
function bizPat(id: string): PatternKey { return PATTERN_KEYS[(strHash(id) >> 4) % PATTERN_KEYS.length]; }

// ── SVG thumbnail ──────────────────────────────────────────────────────────────

function BusinessThumb({ shopId, size = 60, radius = 14 }: { shopId: string; size?: number; radius?: number }) {
  const h = bizHue(shopId);
  const pat = bizPat(shopId);
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
      {pat === 'lines' && (
        <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
          <rect width="80" height="80" fill={`oklch(0.88 0.06 ${h})`} />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 8} y1="0" x2={i * 8 - 30} y2="80" stroke={`oklch(0.78 0.08 ${h})`} strokeWidth="2.4" />)}
        </svg>
      )}
      {pat === 'crosshatch' && (
        <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
          <rect width="80" height="80" fill={`oklch(0.86 0.05 ${h})`} />
          {Array.from({ length: 10 }, (_, i) => <line key={i} x1={i * 9} y1="0" x2={i * 9 - 30} y2="80" stroke={`oklch(0.74 0.07 ${h})`} strokeWidth="2" />)}
          {Array.from({ length: 10 }, (_, i) => <line key={`b${i}`} x1="0" y1={i * 9} x2="80" y2={i * 9 - 30} stroke={`oklch(0.74 0.07 ${h})`} strokeWidth="2" opacity="0.5" />)}
        </svg>
      )}
      {pat === 'dots' && (
        <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
          <rect width="80" height="80" fill={`oklch(0.88 0.045 ${h})`} />
          {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
            <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 10 + 5} r={r % 2 === 0 ? 1.8 : 1.4} fill={`oklch(0.65 0.10 ${h})`} />
          )))}
        </svg>
      )}
      {pat === 'wave' && (
        <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
          <rect width="80" height="80" fill={`oklch(0.88 0.05 ${h})`} />
          <path d="M0 30 Q20 20 40 30 T80 30 L80 80 L0 80 Z" fill={`oklch(0.80 0.07 ${h})`} />
          <path d="M0 50 Q20 40 40 50 T80 50 L80 80 L0 80 Z" fill={`oklch(0.72 0.08 ${h})`} opacity="0.7" />
        </svg>
      )}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  'Onaylandı':   { label: 'Onaylandı',       bg: 'oklch(0.95 0.06 155)', fg: 'oklch(0.34 0.10 155)' },
  'Beklemede':   { label: 'Onay bekleniyor', bg: 'oklch(0.95 0.06 75)',  fg: 'oklch(0.38 0.13 60)'  },
  'Tamamlandı':  { label: 'Tamamlandı',      bg: 'oklch(0.95 0.04 240)', fg: 'oklch(0.38 0.10 240)' },
  'İptal Edildi':{ label: 'İptal edildi',    bg: 'oklch(0.94 0.005 60)', fg: 'oklch(0.50 0.005 60)' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG['Beklemede'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
      fontSize: 11.5, fontWeight: 600, padding: '3px 10px',
      borderRadius: 999, background: s.bg, color: s.fg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
      {s.label}
    </span>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS_LONG  = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR      = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function fmtTimeParts(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? '—';
}

function computeCountdown(apt: AptRow): { main: string; sub: string } {
  let diff = (aptDateTime(apt).getTime() - Date.now()) / 1000;
  if (diff < 0) return { main: '—', sub: 'geçti' };
  const days  = Math.floor(diff / 86400); diff -= days * 86400;
  const hours = Math.floor(diff / 3600);  diff -= hours * 3600;
  const mins  = Math.floor(diff / 60);
  if (days > 0)  return { main: String(days),  sub: `gün${hours > 0 ? ` ${hours} saat` : ''}` };
  if (hours > 0) return { main: String(hours), sub: 'saat' };
  return { main: String(mins), sub: 'dakika' };
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 12 12" fill={i <= value ? '#f59e0b' : '#e2e8f0'}>
          <path d="M6 1l1.6 3.2 3.5.5-2.5 2.5.6 3.5L6 9l-3.2 1.7.6-3.5L0.9 4.7l3.5-.5z" />
        </svg>
      ))}
    </span>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IcoMap({ s = 14 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M7 13c2.5-3 5-5.3 5-8a5 5 0 10-10 0c0 2.7 2.5 5 5 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="7" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IcoCal() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 1.5v2M10 1.5v2M2 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IcoMsg() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 4a1.5 1.5 0 011.5-1.5h7A1.5 1.5 0 0112 4v4.5A1.5 1.5 0 0110.5 10H5l-3 2.5V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const BRAND = '#00A3AD';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Randevularim() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<TabKey>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<AptRow | null>(null);
  const [rateTarget, setRateTarget]     = useState<AptRow | null>(null);
  const [localRatings, setLocalRatings] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data } = await supabase
      .from('appointments')
      .select('*, shops(name, city, district)')
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: false });
    setAppointments((data as AptRow[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const upcoming  = appointments.filter(a => classifyApt(a) === 'upcoming').sort((a, b) => +aptDateTime(a) - +aptDateTime(b));
  const past      = appointments.filter(a => classifyApt(a) === 'past').sort((a, b) => +aptDateTime(b) - +aptDateTime(a));
  const cancelled = appointments.filter(a => classifyApt(a) === 'cancelled').sort((a, b) => +aptDateTime(b) - +aptDateTime(a));

  const nextApt = upcoming[0] ?? null;

  const completed   = past.filter(a => a.status === 'Tamamlandı');
  const totalSpent  = completed.reduce((s, a) => s + (a.price ?? 0), 0);
  const shopCounts: Record<string, number> = {};
  completed.forEach(a => { shopCounts[a.shop_id] = (shopCounts[a.shop_id] ?? 0) + 1; });
  const favId   = Object.keys(shopCounts).sort((a, b) => shopCounts[b] - shopCounts[a])[0];
  const favName = completed.find(a => a.shop_id === favId)?.shops?.name;

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('appointments').update({ status: 'İptal Edildi' }).eq('id', id);
    if (error) { alert('İptal başarısız: ' + error.message); return; }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'İptal Edildi' } : a));
    setCancelTarget(null);
  };

  const handleRate = (id: string, rating: number) => {
    setLocalRatings(prev => ({ ...prev, [id]: rating }));
    setRateTarget(null);
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'upcoming',  label: 'Yaklaşan',    count: upcoming.length  },
    { key: 'past',      label: 'Geçmiş',       count: past.length      },
    { key: 'cancelled', label: 'İptal Edilen', count: cancelled.length },
  ];

  const listMap = { upcoming, past, cancelled };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>Randevularım</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: '#64748b' }}>Tüm randevularını tek yerden takip et.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Randevular yükleniyor…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 24, alignItems: 'start' }}>

            {/* ── Left column ── */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
              <HeroCard apt={nextApt} onCancel={() => nextApt && setCancelTarget(nextApt)} />

              <div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 14, gap: 2 }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '9px 16px 10px', marginBottom: -1,
                      fontSize: 13.5, fontWeight: activeTab === t.key ? 700 : 500,
                      color: activeTab === t.key ? '#0f172a' : '#64748b',
                      borderBottom: `2px solid ${activeTab === t.key ? BRAND : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {t.label}
                      {t.count > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                          background: activeTab === t.key ? BRAND : '#e2e8f0',
                          color: activeTab === t.key ? '#fff' : '#64748b',
                        }}>{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {listMap[activeTab].length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '44px 24px', background: '#fff',
                      borderRadius: 16, border: '1.5px dashed #e2e8f0',
                      fontSize: 14, color: '#94a3b8', fontWeight: 600,
                    }}>
                      {activeTab === 'upcoming'  && 'Yaklaşan randevun yok'}
                      {activeTab === 'past'      && 'Tamamlanmış randevun yok'}
                      {activeTab === 'cancelled' && 'İptal edilmiş randevun yok'}
                    </div>
                  ) : listMap[activeTab].map(apt => (
                    <AptCard
                      key={apt.id}
                      apt={apt}
                      kind={activeTab}
                      localRating={localRatings[apt.id]}
                      onCancel={() => setCancelTarget(apt)}
                      onRate={() => setRateTarget(apt)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Stats sidebar ── */}
            <div style={{ position: 'sticky', top: 96 }}>
              <StatsCard
                completedCount={completed.length}
                upcomingCount={upcoming.length}
                totalSpent={totalSpent}
                favId={favId}
                favName={favName}
                favVisits={shopCounts[favId]}
              />
            </div>
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelModal apt={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />
      )}
      {rateTarget && (
        <RateModal apt={rateTarget} onClose={() => setRateTarget(null)} onSubmit={handleRate} />
      )}
    </main>
  );
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function HeroCard({ apt, onCancel }: { apt: AptRow | null; onCancel: () => void }) {
  if (!apt) {
    return (
      <div style={{ background: '#fff', border: '1.5px dashed #e2e8f0', borderRadius: 20, padding: '36px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Sıradaki randevun</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Planlanmış randevun yok</div>
        <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 22 }}>Yakındaki popüler salonlardan birini keşfet.</div>
        <a href="/businesses" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: BRAND, color: '#fff', padding: '10px 22px',
          borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>İşletme keşfet</a>
      </div>
    );
  }

  const h  = bizHue(apt.shop_id);
  const cd = computeCountdown(apt);
  const d  = aptDateTime(apt);

  return (
    <div style={{
      background: `linear-gradient(135deg, oklch(0.96 0.03 ${h}) 0%, #fff 65%)`,
      border: '1px solid #e8edf2', borderRadius: 20, padding: 26,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -70, top: -70, width: 220, height: 220,
        borderRadius: '50%', background: `oklch(0.92 0.045 ${h})`, opacity: 0.45, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: BRAND, fontWeight: 700 }}>
            Sıradaki randevun
          </span>
          <StatusPill status={apt.status} />
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <BusinessThumb shopId={apt.shop_id} size={96} radius={18} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: -0.4, lineHeight: 1.2 }}>
              {apt.shops?.name ?? 'İşletme'}
            </h2>
            {(apt.shops?.district || apt.shops?.city) && (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {[apt.shops?.district, apt.shops?.city].filter(Boolean).join(', ')}
              </div>
            )}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e8edf2', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <InfoCol label="Hizmet" value={apt.service_name} sub={apt.staff_name ?? '—'} />
              <InfoCol label="Tarih"  value={`${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${DAYS_TR[d.getDay()]}`} sub={fmtTimeParts(apt.appointment_time)} />
              <InfoCol label="Ücret"  value={`${apt.price}₺`} sub="Yerinde ödeme" mono />
            </div>
          </div>

          <div style={{
            flexShrink: 0, width: 108, textAlign: 'center',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 8px',
          }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>kaldı</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: BRAND, lineHeight: 1, letterSpacing: -1, fontFamily: 'monospace' }}>
              {cd.main}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, lineHeight: 1.3 }}>{cd.sub}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <OutlineBtn><IcoCal /> Takvime ekle</OutlineBtn>
          <OutlineBtn><IcoMsg /> Mesaj gönder</OutlineBtn>
          <div style={{ flex: 1 }} />
          <button onClick={onCancel} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: '#fff5f5', color: '#dc2626', border: '1.5px solid #fecaca', cursor: 'pointer',
          }}>
            Randevuyu iptal et
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCol({ label, value, sub, mono }: { label: string; value: string; sub: string; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.2, fontFamily: mono ? 'monospace' : 'inherit', marginBottom: 2, whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
}

function OutlineBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      borderRadius: 999, fontSize: 13, fontWeight: 500, background: '#fff',
      color: '#475569', border: '1.5px solid #e2e8f0', cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

// ── Stats card ─────────────────────────────────────────────────────────────────

function StatsCard({ completedCount, upcomingCount, totalSpent, favId, favName, favVisits }: {
  completedCount: number; upcomingCount: number; totalSpent: number;
  favId?: string; favName?: string; favVisits?: number;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 2 }}>Aktivite özeti</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Son 12 ay</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatTile label="Tamamlanan" value={completedCount}                                                   sub="randevu" />
        <StatTile label="Yaklaşan"   value={upcomingCount}                                                    sub="randevu" />
        <StatTile label="Harcama"    value={totalSpent > 0 ? `${(totalSpent / 1000).toFixed(1)}K` : '—'}     sub="TL" mono />
        <StatTile label="Puan ort."  value="—"                                                                sub="henüz yok" />
      </div>

      {favId && favName && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <BusinessThumb shopId={favId} size={42} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Favorin</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{favName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{favVisits} ziyaret</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, sub, mono }: { label: string; value: string | number; sub: string; mono?: boolean }) {
  return (
    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: -0.3 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AptCard({ apt, kind, localRating, onCancel, onRate }: {
  apt: AptRow; kind: TabKey; localRating?: number;
  onCancel: () => void; onRate: () => void;
}) {
  const d     = aptDateTime(apt);
  const rated = !!localRating;

  return (
    <div
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14,
        opacity: kind === 'cancelled' ? 0.76 : 1, transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#00A3AD55')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
    >
      {/* Date block */}
      <div style={{
        width: 66, flexShrink: 0, textAlign: 'center',
        background: '#f8fafc', borderRadius: 12, padding: '9px 4px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
      }}>
        <div style={{ fontSize: 11, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
          {MONTHS_SHORT[d.getMonth()]}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: -1, fontFamily: 'monospace' }}>
          {d.getDate()}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {DAYS_TR[d.getDay()]}
        </div>
      </div>

      <BusinessThumb shopId={apt.shop_id} size={60} radius={12} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: -0.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: kind === 'cancelled' ? 'line-through' : 'none',
          }}>
            {apt.shops?.name ?? 'İşletme'}
          </span>
          <StatusPill status={apt.status} />
        </div>

        <div style={{ fontSize: 13, color: '#64748b' }}>{apt.service_name}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace' }}>{fmtTimeParts(apt.appointment_time)}</span>
          {(apt.shops?.district || apt.shops?.city) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IcoMap s={11} /> {apt.shops?.district || apt.shops?.city}
            </span>
          )}
          {kind === 'past' && rated && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Stars value={localRating!} size={10} />
              <span style={{ fontSize: 11 }}>· değerlendirildi</span>
            </span>
          )}
          {kind === 'cancelled' && apt.cancel_reason && (
            <span style={{ color: '#94a3b8' }}>{apt.cancel_reason}</span>
          )}
        </div>
      </div>

      {/* Price */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: -0.3 }}>
          {apt.price != null ? `${apt.price}₺` : '—'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, width: 116 }}>
        {kind === 'upcoming' && (
          <ActionBtn danger onClick={onCancel}>İptal</ActionBtn>
        )}
        {kind === 'past' && !rated && (
          <ActionBtn primary onClick={onRate}>Değerlendir</ActionBtn>
        )}
        {kind === 'cancelled' && (
          <ActionBtn primary onClick={() => {}}>Tekrar randevu</ActionBtn>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, primary, danger }: {
  children: ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean;
}) {
  const bg     = primary ? BRAND    : danger ? '#fff5f5'   : '#f1f5f9';
  const color  = primary ? '#fff'   : danger ? '#dc2626'   : '#475569';
  const border = primary ? BRAND    : danger ? '#fecaca'   : '#e2e8f0';
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
      background: bg, color, border: `1.5px solid ${border}`,
      cursor: 'pointer', whiteSpace: 'nowrap', width: '100%',
    }}>
      {children}
    </button>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: 28,
        width: 460, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 28px 72px rgba(0,0,0,0.22)',
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: -0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{subtitle}</div>}
      </div>
      <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 999, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>×</button>
    </div>
  );
}

function CancelModal({ apt, onClose, onConfirm }: { apt: AptRow; onClose: () => void; onConfirm: (id: string) => void }) {
  const [reason, setReason] = useState('');
  const d = aptDateTime(apt);
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Randevuyu iptal et" subtitle="İptal edildiğinde işletme bilgilendirilir." onClose={onClose} />
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{apt.shops?.name ?? 'İşletme'}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {apt.service_name} · {d.getDate()} {MONTHS_LONG[d.getMonth()]} · {fmtTimeParts(apt.appointment_time)}
        </div>
      </div>
      <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>İptal sebebi (opsiyonel)</label>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Programım değişti…"
        style={{
          width: '100%', minHeight: 80, marginTop: 8, padding: 12, boxSizing: 'border-box',
          border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13,
          color: '#0f172a', background: '#f8fafc', resize: 'vertical', outline: 'none',
        }}
      />
      <div style={{ marginTop: 14, padding: 12, background: '#fffbeb', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
        Bilgi: 24 saatten az kala yapılan iptallerde küçük bir iptal ücreti uygulanabilir.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <ActionBtn onClick={onClose}>Vazgeç</ActionBtn>
        <ActionBtn danger onClick={() => { onConfirm(apt.id); setReason(''); }}>Evet, iptal et</ActionBtn>
      </div>
    </ModalOverlay>
  );
}

function RateModal({ apt, onClose, onSubmit }: {
  apt: AptRow; onClose: () => void; onSubmit: (id: string, rating: number, review: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const LABELS = ['', 'Çok kötü', 'İdare eder', 'İyi', 'Çok iyi', 'Mükemmel'];
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Deneyimini puanla" subtitle="Geri bildirimin başka müşterilere yardımcı olur." onClose={onClose} />

      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <BusinessThumb shopId={apt.shop_id} size={44} radius={10} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{apt.shops?.name ?? 'İşletme'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{apt.service_name}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} onClick={() => setRating(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="36" height="36" viewBox="0 0 12 12" fill={i <= rating ? '#f59e0b' : '#e2e8f0'}>
                <path d="M6 1l1.6 3.2 3.5.5-2.5 2.5.6 3.5L6 9l-3.2 1.7.6-3.5L0.9 4.7l3.5-.5z" />
              </svg>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>{rating > 0 ? LABELS[rating] : 'Yıldıza tıkla'}</div>
      </div>

      <textarea
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="Deneyimini birkaç cümleyle özetle (opsiyonel)…"
        style={{
          width: '100%', minHeight: 96, padding: 12, boxSizing: 'border-box',
          border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13,
          color: '#0f172a', background: '#f8fafc', resize: 'vertical', outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <ActionBtn onClick={onClose}>Sonra</ActionBtn>
        <ActionBtn primary onClick={() => { if (rating) onSubmit(apt.id, rating, review); }}>
          Değerlendirmeyi gönder
        </ActionBtn>
      </div>
    </ModalOverlay>
  );
}
