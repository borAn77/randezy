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

// Category-based soft pastel colors for appointment cards (design system)
export type CategoryKey = 'coral' | 'amber' | 'sky' | 'mint' | 'sage' | 'lilac' | 'teal';

export const CATEGORY_COLORS: Record<CategoryKey, { bg: string; edge: string; text: string }> = {
  coral: { bg: '#FFF1EC', edge: '#F2967A', text: '#7A2E15' },
  amber: { bg: '#FBF1DC', edge: '#D8A33D', text: '#5C3B05' },
  sky:   { bg: '#E9F1FA', edge: '#7AA6D6', text: '#1C3858' },
  mint:  { bg: '#E5F3EC', edge: '#67B591', text: '#0F4329' },
  sage:  { bg: '#EEF3E5', edge: '#9CB073', text: '#33401A' },
  lilac: { bg: '#F0EBF8', edge: '#9B86C9', text: '#3A2C5D' },
  teal:  { bg: '#E2F1F2', edge: '#5FA8AE', text: '#10363A' },
};

const CATEGORY_KEYS: CategoryKey[] = ['coral', 'amber', 'sky', 'mint', 'sage', 'lilac', 'teal'];

// Deterministically assign a category color based on service name
export function getCategoryForService(serviceName: string): CategoryKey {
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) & 0xffff;
  }
  return CATEGORY_KEYS[hash % CATEGORY_KEYS.length];
}
