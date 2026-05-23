const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Turkish-convention day of week: 0=Mon … 6=Sun
export function dowTR(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function formatMonthTR(date: Date): string {
  return `${MONTHS_TR[date.getMonth()]} ${date.getFullYear()}`;
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateTR(date: Date): string {
  return `${DAYS_TR[date.getDay()]}, ${date.getDate()} ${MONTHS_TR[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShortTR(date: Date): string {
  return `${date.getDate()} ${MONTHS_TR[date.getMonth()].slice(0, 3)}`;
}

export function getDayShortTR(date: Date): string {
  return DAYS_SHORT_TR[date.getDay()];
}

// Days short in Mon-first order (design system: Pzt Sal Çar Per Cum Cmt Paz)
export const DAYS_MON_FIRST = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
