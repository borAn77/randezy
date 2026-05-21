import { START_HOUR, END_HOUR, PIXELS_PER_MINUTE, MIN_CARD_HEIGHT } from '../constants/layout';

export function minutesFromDayStart(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h - START_HOUR) * 60 + m;
}

export function topForTime(timeStr: string): number {
  return minutesFromDayStart(timeStr) * PIXELS_PER_MINUTE;
}

export function heightForDuration(minutes: number): number {
  return Math.max(MIN_CARD_HEIGHT, minutes * PIXELS_PER_MINUTE);
}

export function nowMinutesFromDayStart(): number {
  const now = new Date();
  return (now.getHours() - START_HOUR) * 60 + now.getMinutes();
}

export function isWithinBusinessHours(): boolean {
  const now = new Date();
  return now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * 60 * PIXELS_PER_MINUTE;
