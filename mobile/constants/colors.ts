export const BRAND = '#6366f1';
export const BRAND_LIGHT = '#eef2ff';
export const BRAND_DARK = '#4338ca';

export const BG = '#f8fafc';
export const SURFACE = '#ffffff';
export const BORDER = '#e8ecf0';

export const STATUS_CONFIG: Record<string, {
  bg: string; text: string; border: string; icon: string; iconBg: string;
}> = {
  'Beklemede':    { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', icon: '●',  iconBg: '#fef3c7' },
  'Onaylandı':   { bg: '#f0fdf4', text: '#14532d', border: '#4ade80', icon: '✓',  iconBg: '#dcfce7' },
  'İptal Edildi': { bg: '#fff1f2', text: '#881337', border: '#fb7185', icon: '✕',  iconBg: '#ffe4e6' },
  'Tamamlandı':  { bg: '#eff6ff', text: '#1e3a5f', border: '#60a5fa', icon: '✓✓', iconBg: '#dbeafe' },
  'Gelmedi':     { bg: '#fafafa', text: '#374151', border: '#9ca3af', icon: '—',  iconBg: '#f3f4f6' },
};
